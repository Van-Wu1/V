document.addEventListener("DOMContentLoaded", async () => {
    console.log("[photograph] init");

    const grid = document.getElementById("photo-grid");
    const filtersContainer = document.getElementById("filters-container");

    // 1) 拉取数据（MVP：本地 JSON）
    let photoData = [];
    try {
        const res = await fetch("./photo-data.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load photo-data.json");
        photoData = await res.json();
    } catch (e) {
        console.error(e);
        if (grid) grid.innerHTML = `<div class="py-20 text-center text-neutral-400">Failed to load data.</div>`;
        return;
    }

    // 2) 自动统计分类（不用手写 filterCategories）
    const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

    const albums = uniq(photoData.map(p => p.album));
    const cameras = uniq(photoData.map(p => p.camera));
    const recipes = uniq(photoData.map(p => p.recipe));
    const lenses = uniq(photoData.map(p => p.lens));
    const tags = uniq(photoData.flatMap(p => p.tags || []));

    const filterCategories = {
        Albums: { items: albums, icon: "lucide:album" },
        Tags: { items: tags, icon: "lucide:tag" },
        Cameras: { items: cameras, icon: "lucide:camera" },
        Recipes: { items: recipes, icon: "lucide:flask-conical" },
        Lenses: { items: lenses, icon: "lucide:aperture" }
    };

    // 3) 渲染筛选面板
    function countBy(category, item) {
        return photoData.filter(p => {
            if (category === "Albums") return p.album === item;
            if (category === "Tags") return (p.tags || []).includes(item);
            if (category === "Cameras") return p.camera === item;
            if (category === "Recipes") return p.recipe === item;
            if (category === "Lenses") return p.lens === item;
            return false;
        }).length;
    }

    function renderFilters() {
        if (!filtersContainer) return;

        let html = "";
        for (const [category, data] of Object.entries(filterCategories)) {
            if (!data.items.length) continue;

            html += `
        <div class="mb-10">
          <div class="flex items-center gap-2 mb-4">
            <span class="iconify text-neutral-400" data-icon="${data.icon}" data-width="14"></span>
            <h3 class="text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400">${category}</h3>
          </div>
          <nav class="space-y-1">
            ${data.items.map(item => `
              <button
                data-filter="${category.toLowerCase()}:${item}"
                class="filter-btn w-full text-left px-3 py-2 rounded text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-none flex justify-between">
                <span>${item}</span>
                <span class="text-xs text-neutral-400">${countBy(category, item)}</span>
              </button>
            `).join("")}
          </nav>
        </div>
      `;
        }
        filtersContainer.innerHTML = html;
    }

    // 4) 渲染网格
    function renderGrid() {
        if (!grid) return;

        const loading = document.getElementById("loading-indicator");
        if (loading) loading.remove();

        grid.innerHTML = photoData.map(p => {
            const dataAttrs = [
                `data-tags="${(p.tags || []).join(",")}"`,
                `data-camera="${p.camera || ""}"`,
                `data-album="${p.album || ""}"`,
                `data-lens="${p.lens || ""}"`,
                `data-recipe="${p.recipe || ""}"`
            ].join(" ");

            return `
        <div class="photo-item break-inside-avoid mb-4 group relative overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900 hover:shadow-xl transition-shadow duration-300 cursor-none"
             ${dataAttrs}
             data-id="${p.id}">
          <img src="${p.src}" alt="${p.alt || ""}" class="w-full h-auto object-cover img-zoom">
          <div class="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div class="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/70 to-transparent">
            <p class="text-white text-sm">${p.alt || ""}</p>
            <p class="text-neutral-300 text-xs mt-1">${p.camera || ""}${p.lens ? " · " + p.lens : ""}</p>
          </div>
        </div>
      `;
        }).join("");

        // 关键：重新挂载 observer（如果 cover.js 里有）
        if (window.observer) {
            document.querySelectorAll(".photo-item").forEach(el => window.observer.observe(el));
        }
    }

    // 5) 筛选逻辑（修复一个你 demo 里常见的小坑：e.target 可能点到 span）
    function setActiveButton(btn) {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("filter-active"));
        btn.classList.add("filter-active");
    }

    function filterPhotos(filter) {
        const all = document.querySelectorAll(".photo-item");
        const [category, value] = filter.includes(":") ? filter.split(":") : [filter, ""];

        all.forEach(el => el.classList.add("fade-out"));

        setTimeout(() => {
            all.forEach(el => {
                let show = false;
                if (filter === "all") show = true;
                else {
                    const ds = el.dataset;
                    if (category === "albums") show = ds.album === value;
                    if (category === "tags") show = (ds.tags || "").split(",").includes(value);
                    if (category === "cameras") show = ds.camera === value;
                    if (category === "recipes") show = ds.recipe === value;
                    if (category === "lenses") show = ds.lens === value;
                }

                if (show) {
                    el.classList.remove("hidden");
                    void el.offsetWidth; // reflow
                    el.classList.remove("fade-out");
                } else {
                    el.classList.add("hidden");
                    el.classList.remove("fade-out");
                }
            });
        }, 180);
    }

    function setupFiltering() {
        document.addEventListener("click", (e) => {
            const btn = e.target.closest(".filter-btn");
            if (!btn) return;

            setActiveButton(btn);
            const filter = btn.dataset.filter || "all";
            filterPhotos(filter);
        });
    }

    // 6) 移动端筛选 toggle（你现在是直接 hidden toggle，MVP OK）
    function setupMobileFilter() {
        const toggleBtn = document.getElementById("mobile-filter-toggle");
        const sidebar = document.querySelector("aside");
        if (!toggleBtn || !sidebar) return;

        toggleBtn.addEventListener("click", () => {
            sidebar.classList.toggle("hidden");
        });
    }

    // ---- run ----
    renderFilters();
    renderGrid();
    setupFiltering();
    setupMobileFilter();

    console.log("[photograph] ready");
});
