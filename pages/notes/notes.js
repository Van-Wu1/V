// ===== 全局文章数据 =====
let allArticlesData = [];
let articlesContainer = null;

// ===== 加载所有文章 JSON =====
async function loadAllArticles() {
    try {
        // 加载文章列表 manifest
        const manifestResponse = await fetch('./content/articles-manifest.json');
        const manifest = await manifestResponse.json();
        
        // 加载所有文章 JSON
        const articlePromises = manifest.articles.map(fileName => 
            fetch(`./content/${fileName}`).then(res => res.json())
        );
        
        allArticlesData = await Promise.all(articlePromises);
        
        // 为每篇文章添加 DOM 元素引用（稍后设置）
        allArticlesData.forEach((article, index) => {
            article.originalIndex = index;
            article.element = null;
        });
        
        return allArticlesData;
    } catch (error) {
        console.error('Error loading articles:', error);
        return [];
    }
}

// ===== 渲染文章列表 =====
function renderArticles() {
    if (!articlesContainer) {
        articlesContainer = document.querySelector('.divide-y');
        if (!articlesContainer) return;
    }
    
    // 清空容器（保留"暂无相关内容"提示）
    const noResultsMessage = document.getElementById('no-results-message');
    articlesContainer.innerHTML = '';
    if (noResultsMessage) {
        articlesContainer.appendChild(noResultsMessage);
    }
    
    // 渲染每篇文章
    allArticlesData.forEach((article, index) => {
        const articleElement = createArticleElement(article, index);
        articlesContainer.appendChild(articleElement);
        article.element = articleElement;
    });
    
    // 重新初始化滚动揭示动画
    setupRevealAnimation();
    
    // 重新初始化悬停光标
    setupHoverCursor();
}

// ===== 创建文章 HTML 元素 =====
function createArticleElement(article, index) {
    const articleDiv = document.createElement('article');
    articleDiv.className = 'note-card py-20 px-8 -mx-8 group cursor-pointer reveal';
    articleDiv.style.transitionDelay = article.revealDelay || `${index * 0.1}s`;
    articleDiv.dataset.articleId = article.id;
    articleDiv.dataset.tag = article.tag;
    articleDiv.dataset.sortableDate = article.sortableDate;
    
    // 直接使用 JSON 中的 date 字段显示完整日期
    const dateDisplay = article.date || '';
    
    articleDiv.innerHTML = `
        <div class="flex flex-col md:flex-row gap-12">
            <div class="md:w-1/4">
                <span class="font-mono text-[10px] opacity-20 tracking-[0.4em] uppercase block mb-2">${dateDisplay}</span>
                <span class="font-mono text-[9px] opacity-10 uppercase block">${article.tag}</span>
            </div>
            <div class="flex-1">
                <h2 class="note-title text-4xl md:text-5xl font-serif text-neutral-900 dark:text-white leading-tight">${article.title}</h2>
                <p class="mt-6 text-base md:text-lg text-neutral-500 dark:text-neutral-400 font-light leading-relaxed max-w-2xl">${article.excerpt}</p>
                <div class="mt-10 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-[-10px] group-hover:translate-x-0">
                    <span class="text-[10px] font-mono uppercase tracking-widest">View Full Entry</span>
                    <div class="h-[1px] w-12 bg-current opacity-30"></div>
                </div>
            </div>
        </div>
    `;
    
    return articleDiv;
}

// ===== 文章数据提取和管理 =====
function extractArticleData() {
    // 从全局数据中返回，但确保 element 引用是最新的
    return allArticlesData.map(article => ({
        ...article,
        element: article.element || document.querySelector(`[data-article-id="${article.id}"]`)
    }));
}

// ===== 搜索功能 =====
function setupSearch() {
    const searchInput = document.querySelector('input[type="search"]');
    if (!searchInput) return;
    
    function performSearch(query) {
        if (!query.trim()) {
            // 如果没有搜索词，显示所有文章（但保留其他筛选的影响）
            // 需要重新应用类别筛选和排序
            const currentCategories = new Set();
            document.querySelectorAll('.dropdown-panel input[type="checkbox"]:checked').forEach(cb => {
                const category = cb.dataset.category || cb.nextElementSibling.textContent.trim();
                currentCategories.add(category);
            });
            
            allArticlesData.forEach(article => {
                if (!article.element) return;
                // 如果类别筛选激活，只显示匹配的
                if (currentCategories.size > 0) {
                    if (currentCategories.has(article.tag)) {
                        article.element.style.display = '';
                    } else {
                        article.element.style.display = 'none';
                    }
                } else {
                    // 没有类别筛选，显示所有
                    article.element.style.display = '';
                }
            });
            
            // 检查是否需要显示"暂无相关内容"
            checkAndShowNoResults();
            return;
        }
        
        const searchLower = query.toLowerCase();
        
        allArticlesData.forEach(article => {
            if (!article.element) return;
            
            const matchesTitle = article.title.toLowerCase().includes(searchLower);
            const matchesContent = (article.excerpt || '').toLowerCase().includes(searchLower);
            const matchesTag = article.tag.toLowerCase().includes(searchLower);
            
            if (matchesTitle || matchesContent || matchesTag) {
                // 还要考虑类别筛选
                const currentCategories = new Set();
                document.querySelectorAll('.dropdown-panel input[type="checkbox"]:checked').forEach(cb => {
                    const category = cb.dataset.category || cb.nextElementSibling.textContent.trim();
                    currentCategories.add(category);
                });
                
                if (currentCategories.size === 0 || currentCategories.has(article.tag)) {
                    article.element.style.display = '';
                } else {
                    article.element.style.display = 'none';
                }
            } else {
                article.element.style.display = 'none';
            }
        });
        
        // 检查是否需要显示"暂无相关内容"
        checkAndShowNoResults();
    }
    
    // 回车键触发搜索
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch(searchInput.value);
        }
    });
    
    // 监听输入删除，当搜索框为空时显示所有文章
    searchInput.addEventListener('input', (e) => {
        if (!e.target.value.trim()) {
            performSearch('');
        }
    });
}

// ===== 字体大小控制 =====
function setupFontSizeControl() {
    const fontController = document.getElementById('font-controller');
    const scalableContent = document.getElementById('scalable-content');
    if (!fontController) return;
    
    const fontSizeMap = {
        'XS': 0.85,
        'S': 0.92,
        'M': 1.0,  // 默认值
        'L': 1.08,
        'XL': 1.15
    };
    
    // 初始化：设置为 M（默认）
    document.documentElement.style.setProperty('--content-scale', '1');
    
    // 使用事件委托，确保能捕获到按钮点击
    fontController.addEventListener('click', (e) => {
        // 检查是否点击的是字体大小按钮
        const button = e.target.closest('.font-step-unit');
        if (!button) return;
        
        e.stopPropagation(); // 阻止事件冒泡到 document
        e.preventDefault(); // 阻止默认行为
        
        const size = button.textContent.trim();
        const scale = fontSizeMap[size] || 1.0;
        
        // 更新 CSS 变量
        document.documentElement.style.setProperty('--content-scale', scale.toString());
        
        // 视觉反馈：移除所有按钮的粗体，给当前按钮添加粗体
        const fontButtons = fontController.querySelectorAll('.font-step-unit');
        fontButtons.forEach(btn => {
            btn.classList.remove('font-bold');
            // 重置所有按钮的 opacity
            btn.style.opacity = '';
        });
        button.classList.add('font-bold');
        
        // 关闭字体控制器
        fontController.classList.remove('active');
    }, true); // 使用捕获阶段，确保先于其他监听器执行
}

// ===== 检查并显示"暂无相关内容" =====
function checkAndShowNoResults() {
    const noResultsMessage = document.getElementById('no-results-message');
    if (!noResultsMessage) return;
    
    const visibleCount = allArticlesData.filter(article => {
        if (!article.element) return false;
        return window.getComputedStyle(article.element).display !== 'none';
    }).length;
    
    if (visibleCount === 0) {
        noResultsMessage.classList.remove('hidden');
    } else {
        noResultsMessage.classList.add('hidden');
    }
}

// ===== 筛选和排序功能 =====
function setupFilters() {
    const defaultBtn = document.getElementById('default-filter-btn');
    const dateSortBtn = document.getElementById('date-sort-btn');
    const articlesContainer = document.querySelector('.divide-y');
    
    // 使用全局的文章数据
    let currentSortOrder = null; // null: 默认, 'asc': 升序, 'desc': 降序
    let selectedCategories = new Set();
    
    // 动态获取类别复选框（在类别生成后）
    const getCategoryCheckboxes = () => {
        return document.querySelectorAll('.dropdown-panel input[type="checkbox"]');
    };
    
    // 默认按钮：重置所有筛选
    if (defaultBtn) {
        defaultBtn.addEventListener('click', () => {
            // 重置排序
            currentSortOrder = null;
            if (dateSortBtn) {
                dateSortBtn.classList.remove('font-bold');
                dateSortBtn.classList.add('opacity-40');
            }
            
            // 重置类别筛选
            selectedCategories.clear();
            getCategoryCheckboxes().forEach(cb => cb.checked = false);
            
            // 重置搜索
            const searchInput = document.querySelector('input[type="search"]');
            if (searchInput) searchInput.value = '';
            
            // 显示所有文章并恢复原始顺序
            allArticlesData.forEach(article => {
                if (article.element) {
                    article.element.style.display = '';
                }
            });
            renderArticles();
            
            // 重置默认按钮样式
            defaultBtn.classList.add('font-bold');
            defaultBtn.classList.remove('opacity-40');
            
            // 检查是否需要显示"暂无相关内容"
            checkAndShowNoResults();
        });
    }
    
    // 生产日期排序
    if (dateSortBtn) {
        dateSortBtn.addEventListener('click', () => {
            const isAsc = currentSortOrder === 'asc';
            currentSortOrder = isAsc ? 'desc' : 'asc';
            
            // 视觉反馈：切换活动状态
            if (currentSortOrder) {
                dateSortBtn.classList.add('font-bold');
                dateSortBtn.classList.remove('opacity-40');
                // 重置默认按钮状态（让它变淡）
                if (defaultBtn) {
                    defaultBtn.classList.remove('font-bold');
                    defaultBtn.classList.add('opacity-40');
                }
            }
            
            // 排序文章
            const sortedArticles = [...allArticlesData].sort((a, b) => {
                if (currentSortOrder === 'asc') {
                    return a.sortableDate.localeCompare(b.sortableDate);
                } else {
                    return b.sortableDate.localeCompare(a.sortableDate);
                }
            });
            
            // 重新渲染排序后的文章
            renderArticles();
            
            // 重新排序 DOM 元素
            sortedArticles.forEach(article => {
                if (article.element) {
                    articlesContainer.appendChild(article.element);
                }
            });
            
            // 检查是否需要显示"暂无相关内容"
            checkAndShowNoResults();
        });
    }
    
    // 类别筛选（使用事件委托，支持动态生成的选项）
    const dropdownPanel = document.querySelector('.dropdown-panel');
    if (dropdownPanel) {
        dropdownPanel.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                const category = e.target.dataset.category || e.target.nextElementSibling.textContent.trim();
                
                if (e.target.checked) {
                    selectedCategories.add(category);
                } else {
                    selectedCategories.delete(category);
                }
                
                filterAndRender();
            }
        });
    }
    
    function filterAndRender() {
        let filteredArticles = [...allArticlesData];
        
        // 类别筛选
        if (selectedCategories.size > 0) {
            filteredArticles = filteredArticles.filter(article => {
                return selectedCategories.has(article.tag);
            });
        }
        
        // 应用当前排序
        if (currentSortOrder) {
            filteredArticles.sort((a, b) => {
                if (currentSortOrder === 'asc') {
                    return a.sortableDate.localeCompare(b.sortableDate);
                } else {
                    return b.sortableDate.localeCompare(a.sortableDate);
                }
            });
        }
        
        // 显示/隐藏文章
        allArticlesData.forEach(article => {
            if (article.element) {
                const isInFiltered = filteredArticles.some(a => a.id === article.id);
                article.element.style.display = isInFiltered ? '' : 'none';
            }
        });
        
        // 检查是否需要显示"暂无相关内容"
        checkAndShowNoResults();
    }
}

// ===== 类别下拉菜单（支持电脑端悬浮和手机端点击） =====
function setupDropdownClose() {
    const filterGroup = document.querySelector('.filter-group');
    const dropdownPanel = document.querySelector('.dropdown-panel');
    if (!filterGroup || !dropdownPanel) return;
    
    // 检测是否为触摸设备（手机端）
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    if (isTouchDevice) {
        // 手机端：使用点击切换
        let isOpen = false;
        
        filterGroup.addEventListener('click', (e) => {
            e.stopPropagation();
            isOpen = !isOpen;
            if (isOpen) {
                dropdownPanel.style.display = 'block';
                filterGroup.classList.add('active');
            } else {
                dropdownPanel.style.display = 'none';
                filterGroup.classList.remove('active');
            }
        });
        
        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!filterGroup.contains(e.target)) {
                isOpen = false;
                dropdownPanel.style.display = 'none';
                filterGroup.classList.remove('active');
            }
        });
    } else {
        // 电脑端：使用悬浮（CSS :hover 已经处理）
        // 添加一个小的延迟，让用户有足够时间移动鼠标到下拉菜单
        let hoverTimeout;
        
        filterGroup.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimeout);
            dropdownPanel.style.display = 'block';
        });
        
        filterGroup.addEventListener('mouseleave', () => {
            hoverTimeout = setTimeout(() => {
                dropdownPanel.style.display = 'none';
            }, 200); // 200ms 延迟，给用户时间移动鼠标
        });
        
        // 确保鼠标移到下拉面板时不会关闭
        dropdownPanel.addEventListener('mouseenter', () => {
            clearTimeout(hoverTimeout);
        });
        
        dropdownPanel.addEventListener('mouseleave', () => {
            hoverTimeout = setTimeout(() => {
                dropdownPanel.style.display = 'none';
            }, 100);
        });
    }
}

// ===== 光标跟随 =====
function setupCursor() {
    const cursor = document.getElementById('cursor');
    if (!cursor) return;
    
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });
}

// ===== 字体控制器展开/收起 =====
function setupFontController() {
    const fontController = document.getElementById('font-controller');
    if (!fontController) return;
    
    // 只在点击图标区域时展开/收起，不在按钮上触发
    const iconButton = fontController.querySelector('.flex-shrink-0');
    if (iconButton) {
        iconButton.addEventListener('click', (e) => {
            e.stopPropagation();
            fontController.classList.toggle('active');
        });
    }
    
    document.addEventListener('click', (e) => {
        if (!fontController.contains(e.target)) {
            fontController.classList.remove('active');
        }
    });
}

// ===== 滚动揭示动画 =====
function setupRevealAnimation() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// ===== 悬停光标放大 =====
function setupHoverCursor() {
    const cursor = document.getElementById('cursor');
    if (!cursor) return;
    
    document.querySelectorAll('.hover-trigger, article, .font-step-unit, button, a, .filter-btn, .filter-group').forEach(t => {
        t.addEventListener('mouseenter', () => {
            cursor.style.transform = 'translate(-50%, -50%) scale(6)';
        });
        t.addEventListener('mouseleave', () => {
            cursor.style.transform = 'translate(-50%, -50%) scale(1)';
        });
    });
}

// ===== 主题切换 =====
function setupThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
    });
}

// ===== 动态生成类别筛选 =====
function setupDynamicCategoryFilter() {
    const dropdownPanel = document.querySelector('.dropdown-panel');
    if (!dropdownPanel) return;
    
    // 从所有文章中提取唯一的 tag
    const allTags = new Set();
    allArticlesData.forEach(article => {
        if (article.tag) {
            allTags.add(article.tag);
        }
    });
    
    // 清空现有选项（保留结构）
    const container = dropdownPanel.querySelector('div');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 动态生成类别选项
    Array.from(allTags).sort().forEach(tag => {
        const label = document.createElement('label');
        label.className = 'flex items-center gap-3 cursor-pointer hover:translate-x-1 transition-transform';
        label.innerHTML = `
            <input type="checkbox" class="accent-current" data-category="${tag}">
            <span>${tag}</span>
        `;
        container.appendChild(label);
    });
}

// ===== 初始化所有功能 =====
document.addEventListener('DOMContentLoaded', async () => {
    // 先设置基础功能
    setupCursor();
    setupFontController();
    setupFontSizeControl();
    setupThemeToggle();
    
    // 加载并渲染文章
    await loadAllArticles();
    renderArticles();
    
    // 设置动态类别筛选（在文章加载后）
    setupDynamicCategoryFilter();
    
    // 设置其他功能（依赖于文章已加载）
    setupRevealAnimation();
    setupHoverCursor();
    setupSearch();
    setupFilters();
    setupDropdownClose();
    
    console.log('Notes page initialized with', allArticlesData.length, 'articles');
});