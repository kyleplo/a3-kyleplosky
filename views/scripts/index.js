let status, active;

document.addEventListener("DOMContentLoaded", async () => {
    window.addEventListener("popstate", () => {
        showPage();
    })

    document.querySelectorAll("button[aria-label=Close]").forEach(btn => {
        btn.addEventListener("click", () => {
            btn.parentElement.parentElement.parentElement.close();
        })
    });

    document.querySelectorAll(".gh-sign-in").forEach(a => {
        a.setAttribute("href", "https://github.com/login/oauth/authorize?client_id=Ov23liXjxJVqJW9S5dNU&redirect_uri=" + location.origin + "/api/gh-authorize")
    })

    document.querySelector("#sign-out-btn").addEventListener("click", async e => {
        e.target.setAttribute("aria-busy", "true");
        await fetch("/api/sign-out", { method: "POST" }).then(r => r.json());
        status.loggedIn = false;
        e.target.setAttribute("aria-busy", "false");
        showPage();
    });

    document.querySelector("#sign-in-btn").addEventListener("click", () => {
        document.querySelector("#sign-in").show();
        document.querySelector("#sign-in-form-error").textContent = "";
    });

    document.querySelector("#sign-up-btn").addEventListener("click", () => {
        document.querySelector("#sign-up").show();
        document.querySelector("#sign-up-form-error").textContent = "";
    });

    document.querySelector("#sign-in-form").addEventListener("submit", async e => {
        e.preventDefault();
        e.target.elements["submit"].setAttribute("aria-busy", "true");
        const data = await fetch("/api/sign-in", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: e.target.elements["username"].value,
                password: e.target.elements["password"].value
            })
        }).then(r => r.json());
        e.target.elements["submit"].setAttribute("aria-busy", "false");

        if (data.success) {
            status.loggedIn = true;
            status.user = e.target.elements["username"].value;
            showPage();
        } else {
            document.querySelector("#sign-in-form-error").textContent = data.error;
        }
    });

    document.querySelector("#sign-up-form").addEventListener("submit", async e => {
        e.preventDefault();
        e.target.elements["submit"].setAttribute("aria-busy", "true");
        const data = await fetch("/api/sign-up", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: e.target.elements["username"].value,
                password: e.target.elements["password"].value,
                password2: e.target.elements["password2"].value
            })
        }).then(r => r.json());
        e.target.elements["submit"].setAttribute("aria-busy", "false");

        if (data.success) {
            status.loggedIn = true;
            status.user = e.target.elements["username"].value;
            showPage();
        } else {
            document.querySelector("#sign-up-form-error").textContent = data.error;
        }
    });

    document.querySelector("#create-list-btn").addEventListener("click", () => {
        active = null;
        document.querySelector("#edit-list").show();
        document.querySelector("#edit-list-options").innerHTML = "";
        document.querySelector("#edit-list-form-error").textContent = "";
        document.querySelector("#edit-list-title").value = "";
        addOption();
        addOption();
        addOption();
    });

    document.querySelector("#edit-list-add-option").addEventListener("click", e => {
        e.preventDefault();
        addOption();
    });

    document.querySelector("#edit-list-form").addEventListener("submit", async e => {
        e.preventDefault();
        e.target.elements["submit"].setAttribute("aria-busy", "true");
        let options = [];
        Array.from(e.target.elements).forEach(elem => {
            if (elem.type === "text" && elem.name !== "title") {
                options.push(elem.value);
            }
        })
        const data = await fetch(active ? "/api/list/" + active.id : "/api/list", {
            method: active ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                title: e.target.elements["title"].value,
                options
            })
        }).then(r => r.json());
        e.target.elements["submit"].setAttribute("aria-busy", "false");

        if (data.success) {
            showPage();
        } else {
            document.querySelector("#edit-list-form-error").textContent = data.error;
        }
    })

    document.querySelector("#my-lists-btn").addEventListener("click", () => {
        history.pushState({}, "", "/");
        showPage();
    })

    document.querySelector("#list-edit").addEventListener("click", () => {
        document.querySelector("#edit-list").show();
        document.querySelector("#edit-list-options").innerHTML = "";
        document.querySelector("#edit-list-form-error").textContent = "";
        document.querySelector("#edit-list-title").value = active.title;
        active.options.forEach(addOption);
    });

    document.querySelector("#list-delete").addEventListener("click", async e => {
        e.target.setAttribute("aria-busy", "true");
        await fetch("/api/list/" + active.id, { method: "DELETE" });
        e.target.setAttribute("aria-busy", "false");
        history.pushState({}, "", "/");
        showPage();
    });

    document.querySelector("#list-remove-vote").addEventListener("click", async e => {
        e.target.setAttribute("aria-busy", "true");
        await fetch("/api/list/" + active.id + "/vote", { method: "DELETE" });
        e.target.setAttribute("aria-busy", "false");
        showPage();
    });

    document.querySelector("#list-vote").addEventListener("click", async e => {
        let voteData = {};

        if (status.loggedIn) {
            e.target.setAttribute("aria-busy", "true");
            voteData = await fetch("/api/list/" + active.id + "/vote").then(r => r.json());
            e.target.setAttribute("aria-busy", "false");
        }

        document.querySelector("#cast-vote").show();
        document.querySelector("#cast-vote-form-error").textContent = "";

        document.querySelector("#cast-vote-form div").innerHTML = "";
        active.options.forEach(opt => {
            const label = document.createElement("LABEL");
            label.textContent = opt + ":"

            const select = document.createElement("SELECT");
            select.setAttribute("data-opt", opt);
            ["S", "A", "B", "C", "D", "F"].forEach((letter, idx) => {
                const option = document.createElement("OPTION");
                option.textContent = letter;
                option.value = 5 - idx;
                if (voteData?.votes[opt] === 5 - idx) {
                    option.setAttribute("selected", "selected");
                }
                select.appendChild(option);
            })
            select.setAttribute("name", Math.random().toString(36).slice(2));
            label.appendChild(select);

            document.querySelector("#cast-vote-form div").append(label)
        })
    });

    document.querySelector("#cast-vote-form").addEventListener("submit", async e => {
        e.preventDefault();
        e.target.elements["submit"].setAttribute("aria-busy", "true");
        let options = [];
        Array.from(e.target.elements).forEach(elem => {
            if (elem.tagName === "SELECT") {
                options.push([elem.getAttribute("data-opt"), parseInt(elem.value)]);
            }
        })
        const data = await fetch("/api/list/" + active.id + "/vote", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                votes: options
            })
        }).then(r => r.json());
        e.target.elements["submit"].setAttribute("aria-busy", "false");

        if (data.success) {
            showPage();
        } else {
            document.querySelector("#cast-vote-form-error").textContent = data.error;
        }
    });

    document.querySelector("#list-share").addEventListener("click", () => {
        navigator.share({
            title: "Vote on " + active.title,
            url: location.href
        })
    })

    status = await fetch("/api/status").then(r => r.json());
    showPage();
});

async function showPage() {
    document.querySelector("#sign-in").close();
    document.querySelector("#sign-up").close();
    document.querySelector("#edit-list").close();
    document.querySelector("#cast-vote").close();

    document.querySelector("main").setAttribute("hidden", "hidden");

    if (status.loggedIn) {
        document.querySelector("#sign-in-btn").setAttribute("hidden", "hidden");
        document.querySelector("#sign-up-btn").setAttribute("hidden", "hidden");
        document.querySelector("#signed-in-display").removeAttribute("hidden", "hidden");
        document.querySelector("#sign-out-btn").removeAttribute("hidden", "hidden");

        document.querySelector("#signed-in-display").textContent = "Signed in as " + status.user;
    } else {
        document.querySelector("#sign-in-btn").removeAttribute("hidden", "hidden");
        document.querySelector("#sign-up-btn").removeAttribute("hidden", "hidden");
        document.querySelector("#signed-in-display").setAttribute("hidden", "hidden");
        document.querySelector("#sign-out-btn").setAttribute("hidden", "hidden");
    }

    document.querySelector("#not-found").setAttribute("hidden", "hidden");

    if (location.pathname === "/" || location.pathname === "index.html") {
        document.querySelector("#home").removeAttribute("hidden");
        document.querySelector("#list").setAttribute("hidden", "hidden");
        document.querySelector("#lists").innerHTML = "";
        active = null;
        document.title = "Tierable"

        if (status.loggedIn) {
            document.querySelector("#sign-in-warning").setAttribute("hidden", "hidden");
            document.querySelector("#create-list-btn").removeAttribute("hidden");

            const lists = await fetch("/api/list").then(r => r.json());

            lists.lists.forEach(list => {
                const row = document.createElement("DIV");
                row.setAttribute("role", "group");
                row.style.marginBottom = "0.5em";

                const name = document.createElement("BUTTON");
                name.textContent = list.title;
                row.append(name);

                name.addEventListener("click", () => {
                    history.pushState({}, "", "/" + list.id);
                    showPage();
                })

                const edit = document.createElement("BUTTON");
                edit.textContent = "Edit";
                edit.classList.add("secondary");
                edit.style.maxWidth = "25%";
                row.append(edit);

                edit.addEventListener("click", () => {
                    active = list;
                    document.querySelector("#edit-list").show();
                    document.querySelector("#edit-list-options").innerHTML = "";
                    document.querySelector("#edit-list-form-error").textContent = "";
                    document.querySelector("#edit-list-title").value = list.title;
                    list.options.forEach(addOption);
                })

                const del = document.createElement("BUTTON");
                del.textContent = "Delete";
                del.classList.add("danger");
                del.style.maxWidth = "25%";
                row.append(del);

                del.addEventListener("click", async () => {
                    del.setAttribute("aria-busy", "true");
                    await fetch("/api/list/" + list.id, { method: "DELETE" });
                    del.setAttribute("aria-busy", "false");
                    row.remove();
                });

                document.querySelector("#lists").append(row);
            });
        } else {
            document.querySelector("#create-list-btn").setAttribute("hidden", "hidden");
            document.querySelector("#sign-in-warning").removeAttribute("hidden");
        }
        
        document.querySelector("main").removeAttribute("hidden");
    } else {
        document.querySelector("#list").removeAttribute("hidden");
        document.querySelector("#home").setAttribute("hidden", "hidden");

        document.querySelector("#list-title").textContent = "";
        document.querySelector("#list-table").innerHTML = "";

        const data = await fetch("/api/list" + location.pathname).then(r => r.json());

        if (!data.success) {
            document.title = "Not Found - Tierable"
            active = null;
            document.querySelector("#list").setAttribute("hidden", "hidden");
            document.querySelector("#not-found").removeAttribute("hidden");
            document.querySelector("main").removeAttribute("hidden");
            return;
        }

        active = data;
        document.title = data.title + " - Tierable"

        if (data.isOwn) {
            document.querySelector("#list-edit").removeAttribute("hidden");
            document.querySelector("#list-delete").removeAttribute("hidden");
        } else {
            document.querySelector("#list-edit").setAttribute("hidden", "hidden");
            document.querySelector("#list-delete").setAttribute("hidden", "hidden");
        }

        if (status.loggedIn) {
            document.querySelector("#list-vote").removeAttribute("hidden");
            document.querySelector("#sign-in-vote-warning").setAttribute("hidden", "hidden");
        } else {
            document.querySelector("#list-vote").setAttribute("hidden", "hidden");
            document.querySelector("#sign-in-vote-warning").removeAttribute("hidden");
        }

        if (data.hasVoted) {
            document.querySelector("#list-remove-vote").removeAttribute("hidden");
        } else {
            document.querySelector("#list-remove-vote").setAttribute("hidden", "hidden");
        }

        if ("share" in navigator) {
            document.querySelector("#list-share").removeAttribute("hidden");
        } else {
            document.querySelector("#list-share").setAttribute("hidden", "hidden");
        }

        document.querySelector("#list-title").textContent = data.title;

        Object.entries(data.tiers).forEach(tier => {
            const tr = document.createElement("TR");

            const th = document.createElement("TH");
            th.textContent = tier[0].toUpperCase();
            th.setAttribute("scope", "row");
            tr.append(th);

            const td = document.createElement("TD");
            td.textContent = tier[1].join(", ");
            tr.append(td);

            document.querySelector("#list-table").append(tr);
        });

        document.querySelector("main").removeAttribute("hidden");
    }
}

function addOption(opt = "") {
    const li = document.createElement("LI");
    li.setAttribute("role", "group");

    const input = document.createElement("INPUT");
    input.setAttribute("type", "text");
    input.setAttribute("pattern", "[\x20-\x7e]{1,100}");
    input.setAttribute("required", "required");
    input.setAttribute("name", Math.random().toString(36).slice(2));
    input.value = opt;
    li.append(input);

    const del = document.createElement("BUTTON");
    del.textContent = "Delete";
    del.classList.add("danger");
    del.addEventListener("click", e => {
        e.preventDefault();
        li.remove();
    })
    li.append(del);
    
    document.querySelector("#edit-list-options").append(li);
}