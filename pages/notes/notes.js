// ===== 文章数据提取和管理 =====
function extractArticleData() {
    const articles = [];
    document.querySelectorAll('.note-card').forEach((card, index) => {
        const dateText = card.querySelector('span[class*="tracking-[0.4em]"]')?.textContent?.trim() || '';
        const tagText = card.querySelector('span[class*="opacity-10"]')?.textContent?.trim() || '';
        const titleText = card.querySelector('.note-title')?.textContent?.trim() || '';
        const contentText = card.querySelector('p')?.textContent?.trim() || '';
        
        // 解析日期为可排序的格式（例如 "Dec 2024" -> 2024-12）
        const dateMatch = dateText.match(/(\w+)\s+(\d+)/);
        let sortableDate = '';
        if (dateMatch) {
            const monthMap = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            };
            const month = monthMap[dateMatch[1]] || '01';
            const year = dateMatch[2];
            sortableDate = `${year}-${month}`;
        }
        
        articles.push({
            element: card,
            date: dateText,
            sortableDate: sortableDate,
            tag: tagText,
            title: titleText,
            content: contentText,
            originalIndex: index
        });
    });
    return articles;
}

// ===== 搜索功能 =====
function setupSearch() {
    const searchInput = document.querySelector('input[type="search"]');
    if (!searchInput) return;
    
    function performSearch(query) {
        const allArticles = extractArticleData();
        
        if (!query.trim()) {
            // 如果没有搜索词，显示所有文章（但保留其他筛选的影响）
            // 需要重新应用类别筛选和排序
            const currentCategories = new Set();
            document.querySelectorAll('.dropdown-panel input[type="checkbox"]:checked').forEach(cb => {
                const category = cb.nextElementSibling.textContent.trim();
                currentCategories.add(category);
            });
            
            allArticles.forEach(article => {
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
        let hasResults = false;
        
        allArticles.forEach(article => {
            const matchesTitle = article.title.toLowerCase().includes(searchLower);
            const matchesContent = article.content.toLowerCase().includes(searchLower);
            const matchesTag = article.tag.toLowerCase().includes(searchLower);
            
            if (matchesTitle || matchesContent || matchesTag) {
                // 还要考虑类别筛选
                const currentCategories = new Set();
                document.querySelectorAll('.dropdown-panel input[type="checkbox"]:checked').forEach(cb => {
                    currentCategories.add(cb.nextElementSibling.textContent.trim());
                });
                
                if (currentCategories.size === 0 || currentCategories.has(article.tag)) {
                    article.element.style.display = '';
                    hasResults = true;
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
    if (!fontController || !scalableContent) return;
    
    const fontSizeMap = {
        'XS': 0.85,
        'S': 0.92,
        'M': 1.0,  // 默认值
        'L': 1.08,
        'XL': 1.15
    };
    
    // 初始化：设置为 M（默认）
    document.documentElement.style.setProperty('--content-scale', '1');
    
    // 获取所有字体大小按钮
    const fontButtons = fontController.querySelectorAll('.font-step-unit');
    
    fontButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const size = button.textContent.trim();
            const scale = fontSizeMap[size] || 1.0;
            
            // 更新 CSS 变量
            document.documentElement.style.setProperty('--content-scale', scale.toString());
            
            // 视觉反馈：可以添加活动状态样式
            fontButtons.forEach(btn => btn.classList.remove('font-bold'));
            button.classList.add('font-bold');
            
            // 关闭字体控制器
            fontController.classList.remove('active');
        });
    });
}

// ===== 检查并显示"暂无相关内容" =====
function checkAndShowNoResults() {
    const noResultsMessage = document.getElementById('no-results-message');
    if (!noResultsMessage) return;
    
    const allArticles = extractArticleData();
    const visibleCount = allArticles.filter(article => {
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
    const categoryCheckboxes = document.querySelectorAll('.dropdown-panel input[type="checkbox"]');
    const articlesContainer = document.querySelector('.divide-y');
    
    let allArticles = extractArticleData();
    let currentSortOrder = null; // null: 默认, 'asc': 升序, 'desc': 降序
    let selectedCategories = new Set();
    
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
            categoryCheckboxes.forEach(cb => cb.checked = false);
            
            // 重置搜索
            const searchInput = document.querySelector('input[type="search"]');
            if (searchInput) searchInput.value = '';
            
            // 显示所有文章并恢复原始顺序
            allArticles.forEach(article => {
                article.element.style.display = '';
            });
            renderArticles(allArticles, false);
            
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
            const sortedArticles = [...allArticles].sort((a, b) => {
                if (currentSortOrder === 'asc') {
                    return a.sortableDate.localeCompare(b.sortableDate);
                } else {
                    return b.sortableDate.localeCompare(a.sortableDate);
                }
            });
            
            renderArticles(sortedArticles, false);
            
            // 检查是否需要显示"暂无相关内容"
            checkAndShowNoResults();
        });
    }
    
    // 类别筛选
    categoryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const category = checkbox.nextElementSibling.textContent.trim();
            
            if (checkbox.checked) {
                selectedCategories.add(category);
            } else {
                selectedCategories.delete(category);
            }
            
            filterAndRender();
        });
    });
    
    function filterAndRender() {
        let filteredArticles = [...allArticles];
        
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
        
        renderArticles(filteredArticles, true);
        
        // 检查是否需要显示"暂无相关内容"
        checkAndShowNoResults();
    }
    
    function renderArticles(articles, hideOthers = false) {
        if (hideOthers) {
            // 隐藏不在列表中的文章
            allArticles.forEach(article => {
                const isInFiltered = articles.some(a => a.originalIndex === article.originalIndex);
                article.element.style.display = isInFiltered ? '' : 'none';
            });
        } else {
            // 重新排序显示
            articles.forEach((article, index) => {
                articlesContainer.appendChild(article.element);
            });
        }
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
    
    fontController.addEventListener('click', (e) => {
        e.stopPropagation();
        fontController.classList.toggle('active');
    });
    
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

// ===== 初始化所有功能 =====
document.addEventListener('DOMContentLoaded', () => {
    setupCursor();
    setupFontController();
    setupFontSizeControl();
    setupRevealAnimation();
    setupHoverCursor();
    setupThemeToggle();
    setupSearch();
    setupFilters();
    setupDropdownClose();
    
    console.log('Notes page initialized');
});