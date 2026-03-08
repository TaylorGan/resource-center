/* ============================================
   中台支撑资源库 - 前台交互逻辑
   依赖 config.js（统一配置）
   ============================================ */

// ==========================================
// 资源数据（localStorage持久化）
// ==========================================
const RESOURCE_STORAGE_KEY = 'resourceCenter_resources';

function loadResources() {
  try {
    const s = localStorage.getItem(RESOURCE_STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch(e) { return []; }
}
function saveResources(data) {
  localStorage.setItem(RESOURCE_STORAGE_KEY, JSON.stringify(data));
}

let RESOURCE_DATA = loadResources();

const FORMAT_ICONS = {
  pdf:   { icon: 'fas fa-file-pdf',        class: 'pdf' },
  word:  { icon: 'fas fa-file-word',       class: 'word' },
  excel: { icon: 'fas fa-file-excel',      class: 'excel' },
  ppt:   { icon: 'fas fa-file-powerpoint', class: 'ppt' },
  video: { icon: 'fas fa-file-video',      class: 'video' },
  image: { icon: 'fas fa-file-image',      class: 'image' },
  zip:   { icon: 'fas fa-file-zipper',     class: 'zip' },
};

// ==========================================
// 状态
// ==========================================
let state = {
  currentView: 'list',
  currentSort: 'newest',
  currentTab: 'all',
  selectedProduct: '',
  selectedCategories: [],
  selectedFormats: [],
  searchQuery: '',
  favorites: new Set(),
  uploadedFiles: [],
  tags: [],
};

let APP_CONFIG = null; // 运行时配置

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ==========================================
// 登录检测
// ==========================================
function checkAuth() {
  const user = localStorage.getItem('resourceCenter_user');
  if (!user) { window.location.href = 'login.html'; return null; }
  return JSON.parse(user);
}

function initUserInfo() {
  const user = checkAuth();
  if (!user) return;
  const el = $('#userAvatarBtn');
  if (!el) return;
  const ch = user.name ? user.name.charAt(0) : '用';
  el.innerHTML = `
    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%234A90D9'/%3E%3Ctext x='20' y='25' text-anchor='middle' fill='white' font-size='16'%3E${encodeURIComponent(ch)}%3C/text%3E%3C/svg%3E" alt="">
    <span>${user.name}</span>
    <div class="user-dropdown" id="userDropdown">
      <div class="user-dropdown-header"><strong>${user.name}</strong><span class="user-role-badge">${user.role}</span></div>
      <div class="user-dropdown-divider"></div>
      <div class="user-dropdown-item" onclick="window.location.href='admin.html'"><i class="fas fa-gauge-high"></i> 后台管理</div>
      <div class="user-dropdown-item" onclick="showToast('info','个人设置功能开发中')"><i class="fas fa-gear"></i> 个人设置</div>
      <div class="user-dropdown-divider"></div>
      <div class="user-dropdown-item logout" onclick="handleLogout()"><i class="fas fa-right-from-bracket"></i> 退出登录</div>
    </div>`;
  el.addEventListener('click', e => { e.stopPropagation(); $('#userDropdown').classList.toggle('show'); });
  document.addEventListener('click', () => { const d=$('#userDropdown'); if(d) d.classList.remove('show'); });
}

function handleLogout() {
  localStorage.removeItem('resourceCenter_user');
  showToast('success','已退出登录');
  setTimeout(() => { window.location.href = 'login.html'; }, 800);
}

// ==========================================
// 动态渲染侧边栏菜单（从config）
// ==========================================
function renderSidebar() {
  const tree = $('#navTree');
  if (!tree) return;
  const menuTree = APP_CONFIG.menuTree || [];

  tree.innerHTML = menuTree.map(group => {
    const childCount = RESOURCE_DATA.filter(r => (group.children||[]).some(c => c.id === r.product)).length;
    const childrenHtml = (group.children||[]).map(child => {
      const cnt = RESOURCE_DATA.filter(r => r.product === child.id).length;
      return `<li class="nav-item">
        <div class="nav-link" data-product="${child.id}">
          <i class="${child.icon || 'fas fa-file'} cat-icon"></i>
          <span>${child.name}</span>
          <span class="count-badge">${cnt}</span>
        </div>
      </li>`;
    }).join('');

    return `<li class="nav-item has-children">
      <div class="nav-link" data-category="${group.id}">
        <i class="fas fa-chevron-right toggle-icon"></i>
        <i class="${group.icon || 'fas fa-folder'} cat-icon"></i>
        <span>${group.name}</span>
        <span class="count-badge">${childCount}</span>
      </div>
      <ul class="sub-nav">${childrenHtml}</ul>
    </li>`;
  }).join('');

  // 绑定展开/折叠
  tree.querySelectorAll('.has-children > .nav-link').forEach(link => {
    link.addEventListener('click', () => {
      const li = link.parentElement;
      li.classList.toggle('expanded');
    });
  });

  // 绑定产品筛选
  tree.querySelectorAll('.nav-link[data-product]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      tree.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      state.selectedProduct = link.dataset.product;
      renderResources();
    });
  });
}

// ==========================================
// 动态渲染书架标签
// ==========================================
function renderTabs() {
  const bar = $('#tabsBar');
  if (!bar) return;
  const shelves = (APP_CONFIG.shelves || []).filter(s => s.enabled).sort((a,b) => a.sort - b.sort);

  bar.innerHTML = shelves.map(s =>
    `<button class="tab${s.id === state.currentTab ? ' active' : ''}" data-tab="${s.id}">
      <i class="${s.icon}"></i> ${s.name}
    </button>`
  ).join('');

  bar.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      bar.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentTab = tab.dataset.tab;
      renderResources();
    });
  });
}

// ==========================================
// 动态渲染筛选面板（类别 + 格式）
// ==========================================
function renderFilters() {
  const catBox = $('#filterCategories');
  const fmtBox = $('#filterFormats');
  if (!catBox || !fmtBox) return;

  const categories = (APP_CONFIG.categories || []).filter(c => c.enabled).sort((a,b) => a.sort - b.sort);
  const formats = (APP_CONFIG.formats || []).filter(f => f.enabled);

  catBox.innerHTML = categories.map(c =>
    `<label class="filter-checkbox"><input type="checkbox" value="${c.id}"> <span>${c.name}</span></label>`
  ).join('');

  fmtBox.innerHTML = formats.map(f =>
    `<label class="filter-checkbox"><input type="checkbox" value="${f.id}"> <span>${f.name}</span></label>`
  ).join('');

  // 绑定事件
  catBox.querySelectorAll('input').forEach(cb => {
    cb.addEventListener('change', () => {
      state.selectedCategories = Array.from(catBox.querySelectorAll('input:checked')).map(i => i.value);
      renderResources();
    });
  });
  fmtBox.querySelectorAll('input').forEach(cb => {
    cb.addEventListener('change', () => {
      state.selectedFormats = Array.from(fmtBox.querySelectorAll('input:checked')).map(i => i.value);
      renderResources();
    });
  });

  // 折叠
  $$('.filter-title').forEach(title => {
    title.addEventListener('click', () => {
      title.parentElement.classList.toggle('collapsed');
    });
  });

  // 重置
  $('#btnResetFilter')?.addEventListener('click', () => {
    catBox.querySelectorAll('input').forEach(cb => cb.checked = false);
    fmtBox.querySelectorAll('input').forEach(cb => cb.checked = false);
    state.selectedCategories = [];
    state.selectedFormats = [];
    state.selectedProduct = '';
    $('#navTree')?.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    renderResources();
    showToast('success', '筛选已重置');
  });
}

// ==========================================
// 动态渲染上传表单下拉（产品/类别/书架/格式）
// ==========================================
function renderUploadSelects() {
  const prodSel = $('#uploadProduct');
  const catSel = $('#uploadCategory');
  const shelfSel = $('#uploadShelf');
  const fmtSel = $('#uploadFormat');

  if (prodSel) {
    let html = '<option value="">请选择产品</option>';
    (APP_CONFIG.menuTree || []).forEach(g => {
      html += `<optgroup label="${g.name}">`;
      (g.children || []).forEach(c => { html += `<option value="${c.id}">${c.name}</option>`; });
      html += '</optgroup>';
    });
    prodSel.innerHTML = html;
  }

  if (catSel) {
    let html = '<option value="">请选择类别</option>';
    (APP_CONFIG.categories || []).filter(c=>c.enabled).sort((a,b)=>a.sort-b.sort).forEach(c => {
      html += `<option value="${c.id}">${c.name}</option>`;
    });
    catSel.innerHTML = html;
  }

  if (shelfSel) {
    let html = '<option value="">请选择书架</option>';
    (APP_CONFIG.shelves || []).filter(s=>s.enabled && s.id!=='all').sort((a,b)=>a.sort-b.sort).forEach(s => {
      html += `<option value="${s.id}">${s.name}</option>`;
    });
    shelfSel.innerHTML = html;
  }

  if (fmtSel) {
    let html = '<option value="">自动识别</option>';
    (APP_CONFIG.formats || []).filter(f=>f.enabled).forEach(f => {
      html += `<option value="${f.id}">${f.name}</option>`;
    });
    fmtSel.innerHTML = html;
  }

  // 产品选择联动路径
  prodSel?.addEventListener('change', () => {
    const val = prodSel.value;
    if (!val) { $('#uploadPath').value = '/resources/'; return; }
    // 查找所属分组
    let basePath = '/resources/';
    for (const g of APP_CONFIG.menuTree) {
      if ((g.children||[]).some(c => c.id === val)) {
        basePath += g.id + '/';
        break;
      }
    }
    basePath += val + '/';
    $('#uploadPath').value = basePath;
  });
}

// ==========================================
// Banner 轮播
// ==========================================
function renderBanner() {
  const track = $('#bannerTrack');
  const dotsC = $('#bannerDots');
  if (!track || !dotsC) return;

  const banners = (APP_CONFIG.banners || []).filter(b => b.enabled).sort((a,b) => a.sort - b.sort);

  if (banners.length === 0) {
    track.innerHTML = '<div class="banner-slide" style="background:linear-gradient(135deg,#1A365D,#2B6CB0);display:flex;align-items:center;justify-content:center;"><div class="banner-content"><div class="banner-title">欢迎使用中台支撑资源库</div><div class="banner-desc">请在后台管理中配置Banner内容</div></div></div>';
    dotsC.innerHTML = '';
    return;
  }

  const defaultGradients = [
    'linear-gradient(135deg,#1A365D,#2B6CB0)',
    'linear-gradient(135deg,#22543D,#38A169)',
    'linear-gradient(135deg,#553C9A,#805AD5)',
    'linear-gradient(135deg,#744210,#D69E2E)',
    'linear-gradient(135deg,#742A2A,#E53E3E)',
  ];

  track.innerHTML = banners.map((b, i) => `
    <div class="banner-slide" style="background:${b.gradient || defaultGradients[i % defaultGradients.length]}">
      <div class="banner-content">
        <div class="banner-tag">${b.tag || ''}</div>
        <div class="banner-title">${b.title}</div>
        <div class="banner-desc">${b.desc || ''}</div>
      </div>
      <i class="${b.icon || 'fas fa-star'} banner-decoration"></i>
    </div>
  `).join('');

  dotsC.innerHTML = banners.map((_, i) => `<div class="banner-dot${i===0?' active':''}" data-index="${i}"></div>`).join('');

  let current = 0;
  const total = banners.length;

  function goTo(idx) {
    current = (idx + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsC.querySelectorAll('.banner-dot').forEach((d, i) => d.classList.toggle('active', i === current));
  }

  $('#bannerPrev')?.addEventListener('click', () => goTo(current - 1));
  $('#bannerNext')?.addEventListener('click', () => goTo(current + 1));
  dotsC.querySelectorAll('.banner-dot').forEach(d => d.addEventListener('click', () => goTo(+d.dataset.index)));

  let timer = setInterval(() => goTo(current + 1), 5000);
  const carousel = $('#bannerCarousel');
  carousel?.addEventListener('mouseenter', () => clearInterval(timer));
  carousel?.addEventListener('mouseleave', () => { timer = setInterval(() => goTo(current + 1), 5000); });
}

// ==========================================
// 最新上传列表
// ==========================================
function updateRecentList() {
  const list = $('#recentList');
  if (!list) return;
  const recent = RESOURCE_DATA.slice(0, 6);
  if (recent.length === 0) {
    list.innerHTML = '<div class="recent-empty">暂无上传记录</div>';
    return;
  }
  list.innerHTML = recent.map(r => {
    const fmt = FORMAT_ICONS[r.format] || FORMAT_ICONS.pdf;
    return `<div class="recent-item" onclick="showDetail(RESOURCE_DATA.find(x=>x.id===${r.id}))">
      <div class="ri-icon ${fmt.class}"><i class="${fmt.icon}"></i></div>
      <div class="ri-info">
        <div class="ri-name">${r.title}</div>
        <div class="ri-time">${r.date} · ${r.size}</div>
      </div>
    </div>`;
  }).join('');
}

// ==========================================
// 资源渲染
// ==========================================
function renderResources() {
  let filtered = [...RESOURCE_DATA];
  const productMap = getProductMap(APP_CONFIG);
  const categoryMap = getCategoryMap(APP_CONFIG);

  // 书架
  if (state.currentTab !== 'all') {
    filtered = filtered.filter(r => r.shelf === state.currentTab);
  }
  // 产品
  if (state.selectedProduct) {
    filtered = filtered.filter(r => r.product === state.selectedProduct);
  }
  // 类别
  if (state.selectedCategories.length > 0) {
    filtered = filtered.filter(r => state.selectedCategories.includes(r.category));
  }
  // 格式
  if (state.selectedFormats.length > 0) {
    filtered = filtered.filter(r => state.selectedFormats.includes(r.format));
  }
  // 搜索
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(r =>
      r.title.toLowerCase().includes(q) ||
      (r.description||'').toLowerCase().includes(q) ||
      (r.tags||[]).some(t => t.toLowerCase().includes(q))
    );
  }

  // 排序
  if (state.currentSort === 'newest') filtered.sort((a,b) => b.date.localeCompare(a.date));
  else if (state.currentSort === 'downloads') filtered.sort((a,b) => b.downloads - a.downloads);
  else if (state.currentSort === 'name') filtered.sort((a,b) => a.title.localeCompare(b.title));

  // 更新计数
  const countEl = $('#resultCount');
  if (countEl) countEl.textContent = filtered.length;

  const listEl = $('#resourceList');
  if (!listEl) return;

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="empty-state">
      <i class="fas fa-inbox"></i>
      <h4>暂无资源</h4>
      <p>当前筛选条件下没有资源，请调整筛选或上传新资源</p>
      <button class="btn-primary" onclick="openModal('uploadModal')"><i class="fas fa-upload"></i> 上传资源</button>
    </div>`;
    return;
  }

  if (state.currentView === 'grid') {
    listEl.className = 'resource-list grid-view';
    listEl.innerHTML = filtered.map(r => {
      const fmt = FORMAT_ICONS[r.format] || FORMAT_ICONS.pdf;
      return `<div class="resource-card" onclick="showDetail(RESOURCE_DATA.find(x=>x.id===${r.id}))">
        <div class="card-icon ${fmt.class}"><i class="${fmt.icon}"></i></div>
        <div class="card-title">${r.title}</div>
        <div class="card-meta">
          <span>${categoryMap[r.category] || r.category}</span>
          <span>${r.size}</span>
        </div>
        <div class="card-footer">
          <span><i class="fas fa-download"></i> ${r.downloads}</span>
          <span>${r.date}</span>
        </div>
      </div>`;
    }).join('');
  } else {
    listEl.className = 'resource-list';
    listEl.innerHTML = filtered.map(r => {
      const fmt = FORMAT_ICONS[r.format] || FORMAT_ICONS.pdf;
      const isFav = state.favorites.has(r.id);
      return `<div class="resource-item">
        <div class="item-icon ${fmt.class}"><i class="${fmt.icon}"></i></div>
        <div class="item-info" onclick="showDetail(RESOURCE_DATA.find(x=>x.id===${r.id}))">
          <div class="item-title">${r.title}</div>
          <div class="item-meta">
            <span class="meta-tag product"><i class="fas fa-cube"></i> ${productMap[r.product] || r.product}</span>
            <span class="meta-tag category"><i class="fas fa-tag"></i> ${categoryMap[r.category] || r.category}</span>
            <span class="meta-tag version">${r.version || ''}</span>
          </div>
        </div>
        <div class="item-stats">
          <span><i class="fas fa-download"></i> ${r.downloads}</span>
          <span><i class="fas fa-hdd"></i> ${r.size}</span>
          <span><i class="fas fa-calendar"></i> ${r.date}</span>
        </div>
        <div class="item-actions">
          <button class="action-btn ${isFav?'active':''}" title="收藏" onclick="toggleFav(${r.id})"><i class="fas fa-star"></i></button>
          <button class="action-btn" title="下载" onclick="downloadResource(${r.id})"><i class="fas fa-download"></i></button>
        </div>
      </div>`;
    }).join('');
  }

  // 分页信息
  const pgInfo = $('.pagination-info');
  if (pgInfo) pgInfo.textContent = `显示 ${filtered.length} / 共 ${RESOURCE_DATA.length} 条`;
}

// ==========================================
// 资源操作
// ==========================================
function showDetail(resource) {
  if (!resource) return;
  const productMap = getProductMap(APP_CONFIG);
  const categoryMap = getCategoryMap(APP_CONFIG);
  const fmt = FORMAT_ICONS[resource.format] || FORMAT_ICONS.pdf;
  $('#detailTitle').textContent = resource.title;
  $('#detailBody').innerHTML = `
    <div class="detail-header-info">
      <div class="detail-icon ${fmt.class}"><i class="${fmt.icon}"></i></div>
      <div class="detail-meta-grid">
        <div class="meta-item"><label>所属产品</label><span>${productMap[resource.product] || resource.product}</span></div>
        <div class="meta-item"><label>资料类别</label><span>${categoryMap[resource.category] || resource.category}</span></div>
        <div class="meta-item"><label>版本号</label><span>${resource.version || '--'}</span></div>
        <div class="meta-item"><label>文件大小</label><span>${resource.size}</span></div>
        <div class="meta-item"><label>上传日期</label><span>${resource.date}</span></div>
        <div class="meta-item"><label>下载次数</label><span>${resource.downloads}</span></div>
        <div class="meta-item"><label>存储路径</label><span>${resource.path || '--'}</span></div>
      </div>
    </div>
    <div class="detail-desc"><h4>资源描述</h4><p>${resource.description || '暂无描述'}</p></div>
    ${resource.tags && resource.tags.length ? '<div class="detail-tags"><h4>标签</h4><div>' + resource.tags.map(t=>'<span class="tag">'+t+'</span>').join('') + '</div></div>' : ''}
  `;
  openModal('detailModal');
}

function toggleFav(id) {
  if (state.favorites.has(id)) { state.favorites.delete(id); showToast('info','已取消收藏'); }
  else { state.favorites.add(id); showToast('success','已收藏'); }
  renderResources();
}

function downloadResource(id) {
  const r = RESOURCE_DATA.find(x => x.id === id);
  if (r) { r.downloads++; saveResources(RESOURCE_DATA); }
  showToast('success', '开始下载...');
  renderResources();
}

// ==========================================
// 上传
// ==========================================
function initUpload() {
  const zone = $('#uploadZone');
  const input = $('#fileInput');

  zone?.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone?.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone?.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });
  input?.addEventListener('change', () => { handleFiles(input.files); });

  $('#btnUploadHeader')?.addEventListener('click', () => openModal('uploadModal'));
  $('#btnSubmitUpload')?.addEventListener('click', submitUpload);
}

function handleFiles(files) {
  const list = $('#uploadFileList');
  if (!list) return;
  state.uploadedFiles = Array.from(files);
  list.innerHTML = state.uploadedFiles.map((f, i) => {
    const ext = f.name.split('.').pop().toLowerCase();
    const fmtKey = {pdf:'pdf',doc:'word',docx:'word',xls:'excel',xlsx:'excel',ppt:'ppt',pptx:'ppt',mp4:'video',avi:'video',mov:'video',jpg:'image',jpeg:'image',png:'image',gif:'image',zip:'zip',rar:'zip','7z':'zip'}[ext] || 'pdf';
    const fmt = FORMAT_ICONS[fmtKey];
    return `<div class="upload-file-item">
      <div class="ufi-icon ${fmt.class}"><i class="${fmt.icon}"></i></div>
      <div class="ufi-info"><div class="ufi-name">${f.name}</div><div class="ufi-size">${(f.size/1024/1024).toFixed(2)} MB</div></div>
      <button class="ufi-remove" onclick="removeFile(${i})"><i class="fas fa-times"></i></button>
    </div>`;
  }).join('');

  // 自动填充名称和格式
  if (state.uploadedFiles.length > 0 && !$('#uploadName').value) {
    const fn = state.uploadedFiles[0].name;
    $('#uploadName').value = fn.substring(0, fn.lastIndexOf('.'));
    const ext = fn.split('.').pop().toLowerCase();
    const fmtKey = {pdf:'pdf',doc:'word',docx:'word',xls:'excel',xlsx:'excel',ppt:'ppt',pptx:'ppt',mp4:'video',avi:'video',mov:'video',jpg:'image',jpeg:'image',png:'image',gif:'image',zip:'zip',rar:'zip','7z':'zip'}[ext] || '';
    if (fmtKey) $('#uploadFormat').value = fmtKey;
  }
}

function removeFile(idx) {
  state.uploadedFiles.splice(idx, 1);
  handleFiles(state.uploadedFiles);
}

function submitUpload() {
  const name = $('#uploadName').value.trim();
  const product = $('#uploadProduct').value;
  const category = $('#uploadCategory').value;
  const shelf = $('#uploadShelf').value;
  const format = $('#uploadFormat').value || 'pdf';
  const version = $('#uploadVersion').value.trim();
  const desc = $('#uploadDesc').value.trim();
  const path = $('#uploadPath').value;

  if (!name) { showToast('error','请输入资源名称'); return; }
  if (!product) { showToast('error','请选择所属产品'); return; }
  if (!category) { showToast('error','请选择资料类别'); return; }
  if (!shelf) { showToast('error','请选择书架归属'); return; }

  const totalSize = state.uploadedFiles.reduce((s,f) => s + f.size, 0);
  const sizeStr = totalSize > 0 ? (totalSize/1024/1024).toFixed(1) + 'MB' : '0MB';
  const today = new Date().toISOString().slice(0,10);

  const newResource = {
    id: Date.now(),
    title: name,
    category, format, shelf, product, version,
    size: sizeStr,
    date: today,
    downloads: 0,
    path: path,
    description: desc,
    tags: [...state.tags],
  };

  RESOURCE_DATA.unshift(newResource);
  saveResources(RESOURCE_DATA);

  showToast('success', `资源上传成功！存储路径: ${path}`);
  addNotification(`资源「${name}」上传成功`, 'upload');

  // 重置
  $('#uploadName').value = '';
  $('#uploadVersion').value = '';
  $('#uploadProduct').value = '';
  $('#uploadCategory').value = '';
  $('#uploadShelf').value = '';
  $('#uploadFormat').value = '';
  $('#uploadPath').value = '/resources/';
  $('#uploadDesc').value = '';
  state.uploadedFiles = [];
  state.tags = [];
  $('#uploadFileList').innerHTML = '';
  $('#tagList').innerHTML = '';

  closeModal('uploadModal');
  renderResources();
  updateRecentList();
  renderSidebar();
}

// ==========================================
// 标签输入
// ==========================================
function initTagInput() {
  const input = $('#tagInput');
  if (!input) return;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      e.preventDefault();
      const tag = input.value.trim();
      if (!state.tags.includes(tag)) {
        state.tags.push(tag);
        renderTags();
      }
      input.value = '';
    }
  });
}

function renderTags() {
  const list = $('#tagList');
  if (!list) return;
  list.innerHTML = state.tags.map((t, i) =>
    `<span class="tag-item">${t} <i class="fas fa-times" onclick="removeTag(${i})"></i></span>`
  ).join('');
}

function removeTag(idx) {
  state.tags.splice(idx, 1);
  renderTags();
}

// ==========================================
// 搜索
// ==========================================
function initSearch() {
  const input = $('#globalSearch');
  if (!input) return;
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.searchQuery = input.value.trim();
      renderResources();
    }, 300);
  });
  // Ctrl+K
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); input.focus(); }
  });
}

// ==========================================
// 排序 & 视图
// ==========================================
function initSort() {
  $('#sortSelect')?.addEventListener('change', e => {
    state.currentSort = e.target.value;
    renderResources();
  });
}

function initViewToggle() {
  $$('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentView = btn.dataset.view;
      renderResources();
    });
  });
}

// ==========================================
// 通知
// ==========================================
function initNotification() {
  const btn = $('#notificationBtn');
  const dropdown = $('#notifDropdown');
  const badge = $('#notifBadge');
  const clearBtn = $('#notifClearBtn');
  if (!btn) return;

  btn.addEventListener('click', e => { e.stopPropagation(); dropdown.classList.toggle('show'); });
  document.addEventListener('click', () => dropdown.classList.remove('show'));
  dropdown.addEventListener('click', e => e.stopPropagation());

  clearBtn?.addEventListener('click', () => {
    badge.textContent = '0'; badge.style.display = 'none';
    $('#notifBody').innerHTML = '<div class="notif-empty">暂无新通知</div>';
    showToast('success','已全部标记为已读');
  });
  badge.style.display = 'none';
}

function addNotification(title, type) {
  const body = $('#notifBody');
  const badge = $('#notifBadge');
  const empty = body?.querySelector('.notif-empty');
  if (empty) empty.remove();
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const item = document.createElement('div');
  item.className = 'notif-item';
  item.innerHTML = `<div class="ni-icon ${type||'upload'}"><i class="fas fa-${type==='system'?'info-circle':'cloud-upload-alt'}"></i></div>
    <div><div class="ni-text">${title}</div><div class="ni-time">今天 ${ts}</div></div>`;
  body.insertBefore(item, body.firstChild);
  const count = parseInt(badge.textContent||'0') + 1;
  badge.textContent = count;
  badge.style.display = 'block';
}

// ==========================================
// 弹窗
// ==========================================
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('show'); document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('show'); document.body.style.overflow = ''; }
}

$$('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) { overlay.classList.remove('show'); document.body.style.overflow = ''; }
  });
});

// ==========================================
// Toast
// ==========================================
function showToast(type, msg) {
  const container = $('#toastContainer');
  if (!container) return;
  const icons = { success:'fas fa-check-circle', error:'fas fa-times-circle', info:'fas fa-info-circle', warning:'fas fa-exclamation-triangle' };
  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.innerHTML = `<i class="${icons[type]||icons.info}"></i><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('out'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ==========================================
// 加载更多
// ==========================================
$('#btnLoadMore')?.addEventListener('click', () => {
  if (RESOURCE_DATA.length === 0) showToast('info','暂无资源，请先上传');
  else showToast('info','已加载全部资源');
});

// ==========================================
// 面包屑
// ==========================================
function initBreadcrumb() {
  $$('.breadcrumb span').forEach(span => {
    span.addEventListener('click', () => {
      if (span.querySelector('.fa-home')) {
        state.currentTab = 'all';
        state.searchQuery = '';
        state.selectedCategories = [];
        state.selectedFormats = [];
        state.selectedProduct = '';
        $('#globalSearch').value = '';
        renderTabs();
        renderFilters();
        renderSidebar();
        renderResources();
      }
    });
  });
}

// ==========================================
// 初始化
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  APP_CONFIG = loadConfig();
  initUserInfo();
  renderSidebar();
  renderTabs();
  renderFilters();
  renderUploadSelects();
  renderBanner();
  initSort();
  initViewToggle();
  initSearch();
  initUpload();
  initTagInput();
  initNotification();
  initBreadcrumb();
  renderResources();
  updateRecentList();
});
