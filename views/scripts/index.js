let status, editing;

window.addEventListener("load", async () => {
    document.querySelectorAll("button[aria-label=Close]").forEach(btn => {
        btn.addEventListener("click", () => {
            btn.parentElement.parentElement.parentElement.close();
        })
    });

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
        editing = null;
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
        const data = await fetch(editing ? "/api/list/" + editing : "/api/list", {
            method: editing ? "PUT" : "POST",
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

    status = await fetch("/api/status").then(r => r.json());
    showPage();
});

async function showPage() {
    document.querySelector("#sign-in").close();
    document.querySelector("#sign-up").close();
    document.querySelector("#edit-list").close();

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

    if (location.pathname === "/" || location.pathname === "index.html") {
        document.querySelector("#home").removeAttribute("hidden");
        document.querySelector("#list").setAttribute("hidden", "hidden");
        document.querySelector("#lists").innerHTML = "";

        if (status.loggedIn) {
            document.querySelector("#sign-in-warning").setAttribute("hidden", "hidden");
            document.querySelector("#create-list-btn").removeAttribute("hidden");

            const lists = await fetch("/api/list").then(r => r.json());

            lists.lists.forEach(list => {
                const row = document.createElement("DIV");
                row.classList.add("grid");
                row.style.marginBottom = "0.5em";

                const name = document.createElement("BUTTON");
                name.textContent = list.title;
                row.append(name);

                const edit = document.createElement("BUTTON");
                edit.textContent = "Edit";
                edit.classList.add("secondary");
                row.append(edit);

                edit.addEventListener("click", () => {
                    editing = list.id;
                    document.querySelector("#edit-list").show();
                    document.querySelector("#edit-list-options").innerHTML = "";
                    document.querySelector("#edit-list-form-error").textContent = "";
                    document.querySelector("#edit-list-title").value = list.title;
                    list.options.forEach(addOption);
                })

                const del = document.createElement("BUTTON");
                del.textContent = "Delete";
                del.classList.add("secondary");
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
    } else {
        document.querySelector("#list").removeAttribute("hidden");
        document.querySelector("#home").setAttribute("hidden", "hidden");
    }
}

function addOption(opt = "") {
    const li = document.createElement("LI");
    li.setAttribute("role", "group");

    const input = document.createElement("INPUT");
    input.setAttribute("type", "text");
    input.setAttribute("pattern", "[\x20-\x7e]{2,100}");
    input.setAttribute("required", "required");
    input.value = opt;
    li.append(input);

    const del = document.createElement("BUTTON");
    del.textContent = "Delete";
    del.classList.add("secondary");
    del.addEventListener("click", e => {
        e.preventDefault();
        li.remove();
    })
    li.append(del);
    
    document.querySelector("#edit-list-options").append(li);
}