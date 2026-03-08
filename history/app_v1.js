/* ============================================
   中台支撑资源库 - 交互逻辑
   ============================================ */

// ==========================================
// 模拟数据
// ==========================================
const RESOURCE_DATA = [];

const FORMAT_ICONS = {
  pdf: { icon: 'fas fa-file-pdf', class: 'pdf' },
  word: { icon: 'fas fa-file-word', class: 'word' },
  excel: { icon: 'fas fa-file-excel', class: 'excel' },
  ppt: { icon: 'fas fa-file-powerpoint', class: 'ppt' },
  video: { icon: 'fas fa-file-video', class: 'video' },
  image: { icon: 'fas fa-file-image', class: 'image' },
  zip: { icon: 'fas fa-file-zipper', class: 'zip' },
};

const CATEGORY_NAMES = {
  'product-detail': '商品详情页',
  'product-spec': '产品SPEC(彩页)',
  'product-plan': '产品方案',
  'install-guide': '安装指南',
  'user-manual': '用户手册',
  'config-guide': '配置指南',
  'release-note': '版本说明',
  'api-doc': 'API文档',
  'white-paper': '白皮书',
};

const PRODUCT_NAMES = {
  camera: '智能摄像机系列', nvr: '网络硬盘录像机', access: '门禁控制设备', alarm: '报警探测设备',
  isecure: 'iSecure Center', infovision: 'Infovision AR', education: '教育安防平台',
  finance: '金融安防平台', traffic: '交通管控平台', 'smart-city': '智慧城市', 'smart-park': '智慧园区',
  'smart-retail': '智慧零售', 'tech-training': '技术培训', 'sales-training': '销售培训',
};

// ==========================================
// 状态管理
// ==========================================
let state = {
  currentView: 'list',
  currentSort: 'newest',
  currentTab: 'all',
  selectedCategories: [],
  selectedFormats: [],
  searchQuery: '',
  favorites: new Set(),
  uploadedFiles: [],
  tags: [],
};

// ==========================================
// DOM 引用
// ==========================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ==========================================
// 登录状态检测
// ==========================================
function checkAuth() {
  const user = localStorage.getItem('resourceCenter_user');
  if (!user) {
    // window.location.href = 'login.html'; // disabled for history
    return null;
  }
  return JSON.parse(user);
}

function initUserInfo() {
  const user = checkAuth();
  if (!user) return;

  // 更新顶部用户信息
  const avatarEl = document.querySelector('.user-avatar');
  if (avatarEl) {
    const firstChar = user.name ? user.name.charAt(0) : '用';
    avatarEl.innerHTML = `
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%234A90D9'/%3E%3Ctext x='20' y='25' text-anchor='middle' fill='white' font-size='16'%3E${encodeURIComponent(firstChar)}%3C/text%3E%3C/svg%3E" alt="用户">
      <span>${user.name}</span>
      <div class="user-dropdown" id="userDropdown">
        <div class="user-dropdown-header">
          <strong>${user.name}</strong>
          <span class="user-role-badge">${user.role}</span>
        </div>
        <div class="user-dropdown-divider"></div>
        <div class="user-dropdown-item" onclick="window.location.href='admin.html'">
          <i class="fas fa-gauge-high"></i> 后台管理
        </div>
        <div class="user-dropdown-item" onclick="showToast('success','个人设置功能开发中')">
          <i class="fas fa-gear"></i> 个人设置
        </div>
        <div class="user-dropdown-divider"></div>
        <div class="user-dropdown-item logout" onclick="handleLogout()">
          <i class="fas fa-right-from-bracket"></i> 退出登录
        </div>
      </div>
    `;
    avatarEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const dd = document.getElementById('userDropdown');
      dd.classList.toggle('show');
    });
    document.addEventListener('click', () => {
      const dd = document.getElementById('userDropdown');
      if (dd) dd.classList.remove('show');
    });
  }
}

function handleLogout() {
  localStorage.removeItem('resourceCenter_user');
  showToast('success', '已退出登录');
  setTimeout(() => {
    // window.location.href = 'login.html'; // disabled for history
  }, 800);
}

// ==========================================
// 初始化
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initUserInfo();
  initSidebar();
  initTabs();
  initFilters();
  initSort();
  initViewToggle();
  initSearch();
  initUploadModal();
  initDetailModal();
  initTagInput();
  initBanner();
  initNotification();
  initBreadcrumb();
  renderResources();
  updateRecentList();
});

// ==========================================
// 侧边栏
// ==========================================
function initSidebar() {
  // 折叠/展开子菜单
  $$('.nav-item.has-children > .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const item = link.parentElement;
      const subNav = item.querySelector('.sub-nav');
      
      if (item.classList.contains('expanded')) {
        item.classList.remove('expanded');
        slideUp(subNav);
      } else {
        item.classList.add('expanded');
        slideDown(subNav);
      }
    });
  });

  // 子菜单项点击
  $$('.sub-nav .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.stopPropagation();
      $$('.nav-link.active').forEach(el => el.classList.remove('active'));
      link.classList.add('active');
      link.closest('.has-children').querySelector(':scope > .nav-link').classList.add('active');
      
      showToast('success', `已切换到: ${link.querySelector('span').textContent}`);
      renderResources();
    });
  });

  // 侧边栏折叠按钮
  $('#btnCollapse').addEventListener('click', () => {
    const sidebar = $('#sidebar');
    sidebar.classList.toggle('collapsed');
    const icon = $('#btnCollapse').querySelector('i');
    if (sidebar.classList.contains('collapsed')) {
      icon.className = 'fas fa-angles-right';
    } else {
      icon.className = 'fas fa-angles-left';
    }
  });
}

// 滑动动画
function slideDown(el) {
  el.style.display = 'block';
  el.style.height = '0';
  el.style.overflow = 'hidden';
  el.style.transition = 'height 0.3s ease';
  requestAnimationFrame(() => {
    el.style.height = el.scrollHeight + 'px';
    setTimeout(() => {
      el.style.height = '';
      el.style.overflow = '';
      el.style.transition = '';
    }, 300);
  });
}

function slideUp(el) {
  el.style.height = el.scrollHeight + 'px';
  el.style.overflow = 'hidden';
  el.style.transition = 'height 0.3s ease';
  requestAnimationFrame(() => {
    el.style.height = '0';
    setTimeout(() => {
      el.style.display = 'none';
      el.style.height = '';
      el.style.overflow = '';
      el.style.transition = '';
    }, 300);
  });
}

// ==========================================
// 标签栏
// ==========================================
function initTabs() {
  $$('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      state.currentTab = tab.dataset.tab;
      renderResources();
    });
  });
}

// ==========================================
// 筛选器
// ==========================================
function initFilters() {
  // 类别筛选
  $$('.filter-section:first-child .filter-checkbox input').forEach(cb => {
    cb.addEventListener('change', () => {
      updateSelectedCategories();
      renderResources();
    });
  });

  // 格式筛选
  $$('.filter-section:nth-child(2) .filter-checkbox input').forEach(cb => {
    cb.addEventListener('change', () => {
      updateSelectedFormats();
      renderResources();
    });
  });

  // 清空按钮
  $('#btnClearCategory').addEventListener('click', () => {
    $$('.filter-section:first-child .filter-checkbox input').forEach(cb => cb.checked = false);
    updateSelectedCategories();
    renderResources();
  });

  $('#btnClearFormat').addEventListener('click', () => {
    $$('.filter-section:nth-child(2) .filter-checkbox input').forEach(cb => cb.checked = false);
    updateSelectedFormats();
    renderResources();
  });

  $('#btnClearAll').addEventListener('click', () => {
    $$('.filter-checkbox input').forEach(cb => cb.checked = false);
    state.selectedCategories = [];
    state.selectedFormats = [];
    renderResources();
    showToast('success', '已清空所有筛选条件');
  });
}

function updateSelectedCategories() {
  state.selectedCategories = [];
  $$('.filter-section:first-child .filter-checkbox input:checked').forEach(cb => {
    state.selectedCategories.push(cb.value);
  });
}

function updateSelectedFormats() {
  state.selectedFormats = [];
  $$('.filter-section:nth-child(2) .filter-checkbox input:checked').forEach(cb => {
    state.selectedFormats.push(cb.value);
  });
}

// ==========================================
// 排序
// ==========================================
function initSort() {
  const btnSort = $('#btnSort');
  const sortMenu = $('#sortMenu');

  btnSort.addEventListener('click', (e) => {
    e.stopPropagation();
    sortMenu.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    sortMenu.classList.remove('show');
  });

  $$('.sort-option').forEach(opt => {
    opt.addEventListener('click', () => {
      $$('.sort-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      state.currentSort = opt.dataset.sort;
      btnSort.innerHTML = `<i class="fas fa-arrow-down-wide-short"></i> ${opt.textContent} <i class="fas fa-chevron-down"></i>`;
      sortMenu.classList.remove('show');
      renderResources();
    });
  });
}

// ==========================================
// 视图切换
// ==========================================
function initViewToggle() {
  $$('.btn-view').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.btn-view').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentView = btn.dataset.view;
      const list = $('#resourceList');
      if (state.currentView === 'grid') {
        list.classList.add('grid-view');
      } else {
        list.classList.remove('grid-view');
      }
    });
  });
}

// ==========================================
// 搜索
// ==========================================
function initSearch() {
  const searchInput = $('#globalSearch');
  let debounceTimer;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      state.searchQuery = searchInput.value.trim().toLowerCase();
      renderResources();
    }, 300);
  });

  // Ctrl+K 快捷键
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === 'Escape') {
      searchInput.blur();
      closeAllModals();
    }
  });
}

// ==========================================
// 渲染资源列表
// ==========================================
function renderResources() {
  const list = $('#resourceList');
  let filtered = [...RESOURCE_DATA];

  // 搜索过滤
  if (state.searchQuery) {
    filtered = filtered.filter(r =>
      r.title.toLowerCase().includes(state.searchQuery) ||
      r.description.toLowerCase().includes(state.searchQuery) ||
      r.tags.some(t => t.toLowerCase().includes(state.searchQuery))
    );
  }

  // 标签过滤
  if (state.currentTab !== 'all') {
    filtered = filtered.filter(r => r.shelf === state.currentTab);
  }

  // 类别过滤
  if (state.selectedCategories.length > 0) {
    filtered = filtered.filter(r => state.selectedCategories.includes(r.category));
  }

  // 格式过滤
  if (state.selectedFormats.length > 0) {
    filtered = filtered.filter(r => state.selectedFormats.includes(r.format));
  }

  // 排序
  switch (state.currentSort) {
    case 'newest': filtered.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
    case 'oldest': filtered.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
    case 'name': filtered.sort((a, b) => a.title.localeCompare(b.title, 'zh')); break;
    case 'size': filtered.sort((a, b) => parseFloat(b.size) - parseFloat(a.size)); break;
    case 'downloads': filtered.sort((a, b) => b.downloads - a.downloads); break;
  }

  // 更新计数
  $('#resultCount').textContent = filtered.length;

  // 渲染卡片
  list.innerHTML = '';
  
  if (filtered.length === 0) {
    list.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--text-muted);">
        <i class="fas fa-inbox" style="font-size:48px;margin-bottom:16px;display:block;"></i>
        <p style="font-size:15px;margin-bottom:8px;">暂无匹配的资源</p>
        <p style="font-size:13px;">请尝试调整筛选条件或搜索关键词</p>
      </div>
    `;
    return;
  }

  filtered.forEach((resource, index) => {
    const fmt = FORMAT_ICONS[resource.format] || FORMAT_ICONS.pdf;
    const isFav = state.favorites.has(resource.id);
    
    const card = document.createElement('div');
    card.className = 'resource-card';
    card.style.animationDelay = `${index * 0.05}s`;
    card.innerHTML = `
      <div class="resource-icon ${fmt.class}">
        <i class="${fmt.icon}"></i>
      </div>
      <div class="resource-info">
        <div class="resource-title">${highlightSearch(resource.title)}</div>
        <div class="resource-meta">
          <span class="resource-tag">${CATEGORY_NAMES[resource.category] || resource.category}</span>
          <span><i class="fas fa-box"></i> ${PRODUCT_NAMES[resource.product] || resource.product}</span>
          ${resource.version ? `<span><i class="fas fa-code-branch"></i> ${resource.version}</span>` : ''}
          <span><i class="fas fa-calendar"></i> ${resource.date}</span>
          <span><i class="fas fa-file"></i> ${resource.size}</span>
          <span><i class="fas fa-download"></i> ${resource.downloads}</span>
        </div>
      </div>
      <div class="resource-actions">
        <button class="btn-action" title="下载" onclick="event.stopPropagation(); handleDownload(${resource.id})">
          <i class="fas fa-download"></i>
        </button>
        <button class="btn-action" title="分享" onclick="event.stopPropagation(); handleShare(${resource.id})">
          <i class="fas fa-share-nodes"></i>
        </button>
        <button class="btn-action ${isFav ? 'favorited' : ''}" title="收藏" onclick="event.stopPropagation(); handleFavorite(${resource.id}, this)">
          <i class="fas fa-${isFav ? 'star' : 'star'}"></i>
        </button>
      </div>
    `;

    card.addEventListener('click', () => showDetail(resource));
    list.appendChild(card);
  });

  // 更新分页信息
  $('.page-info').textContent = `显示 1-${filtered.length} / 共 ${filtered.length} 条`;
}

function highlightSearch(text) {
  if (!state.searchQuery) return text;
  const regex = new RegExp(`(${state.searchQuery})`, 'gi');
  return text.replace(regex, '<mark style="background:#FEFCBF;padding:0 2px;border-radius:2px;">$1</mark>');
}

// ==========================================
// 资源操作
// ==========================================
function handleDownload(id) {
  const resource = RESOURCE_DATA.find(r => r.id === id);
  showToast('success', `开始下载: ${resource.title}`);
}

function handleShare(id) {
  const resource = RESOURCE_DATA.find(r => r.id === id);
  // 模拟复制链接
  const url = `https://resource.example.com${resource.path}${resource.id}`;
  navigator.clipboard?.writeText(url);
  showToast('success', '分享链接已复制到剪贴板');
}

function handleFavorite(id, btn) {
  if (state.favorites.has(id)) {
    state.favorites.delete(id);
    btn.classList.remove('favorited');
    showToast('warning', '已取消收藏');
  } else {
    state.favorites.add(id);
    btn.classList.add('favorited');
    showToast('success', '已添加到收藏');
  }
}

// ==========================================
// 资源详情弹窗
// ==========================================
function initDetailModal() {
  $('#btnCloseDetail').addEventListener('click', () => closeModal('detailModal'));
  $('#btnCloseDetail2').addEventListener('click', () => closeModal('detailModal'));
  $('#btnDownloadDetail').addEventListener('click', () => {
    showToast('success', '开始下载资源...');
    closeModal('detailModal');
  });
}

function showDetail(resource) {
  const fmt = FORMAT_ICONS[resource.format];
  $('#detailTitle').innerHTML = `<i class="${fmt.icon}" style="color:var(--primary)"></i> 资源详情`;
  
  $('#detailBody').innerHTML = `
    <h3 style="font-size:16px;margin-bottom:16px;line-height:1.5;">${resource.title}</h3>
    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">${resource.description}</p>
    <div class="detail-info-grid">
      <div class="detail-info-item">
        <span class="label">所属产品</span>
        <span class="value">${PRODUCT_NAMES[resource.product]}</span>
      </div>
      <div class="detail-info-item">
        <span class="label">资源类别</span>
        <span class="value">${CATEGORY_NAMES[resource.category]}</span>
      </div>
      <div class="detail-info-item">
        <span class="label">文件格式</span>
        <span class="value"><i class="${fmt.icon} format-icon ${fmt.class}"></i> ${resource.format.toUpperCase()}</span>
      </div>
      <div class="detail-info-item">
        <span class="label">文件大小</span>
        <span class="value">${resource.size}</span>
      </div>
      <div class="detail-info-item">
        <span class="label">适用版本</span>
        <span class="value">${resource.version || '通用'}</span>
      </div>
      <div class="detail-info-item">
        <span class="label">更新日期</span>
        <span class="value">${resource.date}</span>
      </div>
      <div class="detail-info-item">
        <span class="label">下载次数</span>
        <span class="value">${resource.downloads} 次</span>
      </div>
      <div class="detail-info-item">
        <span class="label">存储路径</span>
        <span class="value" style="font-family:monospace;font-size:12px;">${resource.path}</span>
      </div>
    </div>
    <div style="margin-top:16px;">
      <span class="label" style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:8px;">标签</span>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${resource.tags.map(t => `<span class="resource-tag">${t}</span>`).join('')}
      </div>
    </div>
    <div class="detail-preview">
      <i class="${fmt.icon}"></i>
      <p>文件预览区域</p>
      <p style="font-size:12px;">点击下载查看完整文件</p>
    </div>
  `;

  openModal('detailModal');
}

// ==========================================
// 上传弹窗
// ==========================================
function initUploadModal() {
  const uploadZone = $('#uploadZone');
  const fileInput = $('#fileInput');

  // 打开上传弹窗
  $('#btnUploadHeader').addEventListener('click', () => openModal('uploadModal'));
  $('#btnCloseModal').addEventListener('click', () => closeModal('uploadModal'));
  $('#btnCancelUpload').addEventListener('click', () => closeModal('uploadModal'));

  // 点击上传区域
  uploadZone.addEventListener('click', () => fileInput.click());

  // 拖拽上传
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });

  // 文件选择
  fileInput.addEventListener('change', () => {
    handleFiles(fileInput.files);
    fileInput.value = '';
  });

  // 确认上传
  $('#btnConfirmUpload').addEventListener('click', handleUploadConfirm);

  // 产品选择联动上传路径
  $('#resourceProduct').addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) {
      // 根据产品分类确定路径
      let basePath = '/resources/';
      if (['camera', 'nvr', 'access', 'alarm'].includes(val)) {
        basePath += 'hardware/';
      } else if (['smart-city', 'smart-park', 'smart-retail'].includes(val)) {
        basePath += 'solution/';
      } else if (['tech-training', 'sales-training'].includes(val)) {
        basePath += 'training/';
      } else {
        basePath += 'software/';
      }
      basePath += val + '/';
      $('#uploadPath').value = basePath;
    }
  });
}

function handleFiles(files) {
  const fileList = $('#uploadFileList');
  
  Array.from(files).forEach(file => {
    const fileId = Date.now() + Math.random();
    state.uploadedFiles.push({ id: fileId, file });

    const ext = file.name.split('.').pop().toLowerCase();
    let formatClass = 'pdf';
    if (['doc', 'docx'].includes(ext)) formatClass = 'word';
    else if (['xls', 'xlsx'].includes(ext)) formatClass = 'excel';
    else if (['ppt', 'pptx'].includes(ext)) formatClass = 'ppt';
    else if (['mp4', 'avi', 'mov'].includes(ext)) formatClass = 'video';
    else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) formatClass = 'image';
    else if (['zip', 'rar', '7z'].includes(ext)) formatClass = 'zip';

    const fmt = FORMAT_ICONS[formatClass];

    const item = document.createElement('div');
    item.className = 'upload-file-item';
    item.id = `file-${fileId}`;
    item.innerHTML = `
      <i class="${fmt.icon} file-icon" style="color:var(--primary-light)"></i>
      <div class="file-info">
        <div class="file-name">${file.name}</div>
        <div class="file-size">${formatFileSize(file.size)}</div>
        <div class="file-progress">
          <div class="file-progress-bar" style="width: 0%"></div>
        </div>
      </div>
      <button class="btn-remove-file" onclick="removeUploadFile('${fileId}')">
        <i class="fas fa-xmark"></i>
      </button>
    `;
    fileList.appendChild(item);

    // 模拟上传进度
    simulateProgress(item.querySelector('.file-progress-bar'));

    // 自动填充资源名称
    if (!$('#resourceName').value) {
      $('#resourceName').value = file.name.replace(/\.[^/.]+$/, '');
    }
  });
}

function simulateProgress(bar) {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 20 + 5;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
    }
    bar.style.width = progress + '%';
  }, 200);
}

function removeUploadFile(fileId) {
  state.uploadedFiles = state.uploadedFiles.filter(f => f.id != fileId);
  const el = document.getElementById(`file-${fileId}`);
  if (el) {
    el.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function handleUploadConfirm() {
  const name = $('#resourceName').value;
  const product = $('#resourceProduct').value;
  const category = $('#resourceCategory').value;
  const shelf = $('#resourceShelf').value;

  if (!name) { showToast('error', '请输入资源名称'); return; }
  if (!product) { showToast('error', '请选择所属产品'); return; }
  if (!category) { showToast('error', '请选择资源类别'); return; }
  if (!shelf) { showToast('error', '请选择书架归属'); return; }
  if (state.uploadedFiles.length === 0) { showToast('error', '请选择要上传的文件'); return; }

  // 模拟上传成功
  const uploadPath = $('#uploadPath').value;
  showToast('success', `资源上传成功！存储路径: ${uploadPath}`);
  addNotification(`资源「${name}」上传成功`, 'upload');
  
  // 添加到数据中
  const newResource = {
    id: RESOURCE_DATA.length + 1,
    title: name,
    category: category,
    format: guessFormat(state.uploadedFiles[0]?.file?.name || 'file.pdf'),
    shelf: shelf,
    product: product,
    version: $('#resourceVersion').value || '',
    size: state.uploadedFiles[0] ? formatFileSize(state.uploadedFiles[0].file.size) : '0B',
    date: new Date().toISOString().split('T')[0],
    downloads: 0,
    path: uploadPath,
    description: $('#resourceDesc').value || name,
    tags: state.tags.slice(),
  };
  RESOURCE_DATA.unshift(newResource);

  // 重置表单
  resetUploadForm();
  closeModal('uploadModal');
  renderResources();
  updateRecentList();
  updateSidebarCounts();
}

function guessFormat(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['ppt', 'pptx'].includes(ext)) return 'ppt';
  if (['mp4', 'avi', 'mov'].includes(ext)) return 'video';
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'image';
  if (['zip', 'rar', '7z'].includes(ext)) return 'zip';
  return 'pdf';
}

function resetUploadForm() {
  $('#resourceName').value = '';
  $('#resourceProduct').value = '';
  $('#resourceCategory').value = '';
  $('#resourceShelf').value = '';
  $('#resourceVersion').value = '';
  $('#resourceDesc').value = '';
  $('#uploadPath').value = '/resources/software/isecure/';
  $('#uploadFileList').innerHTML = '';
  $('#tagsContainer').innerHTML = '';
  state.uploadedFiles = [];
  state.tags = [];
}

// ==========================================
// 标签输入
// ==========================================
function initTagInput() {
  const input = $('#tagInput');
  const container = $('#tagsContainer');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      e.preventDefault();
      const tag = input.value.trim();
      if (!state.tags.includes(tag)) {
        state.tags.push(tag);
        const tagEl = document.createElement('span');
        tagEl.className = 'tag-item';
        tagEl.innerHTML = `${tag} <button class="btn-remove-tag" onclick="removeTag('${tag}', this)">&times;</button>`;
        container.appendChild(tagEl);
      }
      input.value = '';
    }
  });
}

function removeTag(tag, btn) {
  state.tags = state.tags.filter(t => t !== tag);
  btn.parentElement.remove();
}

// ==========================================
// 弹窗控制
// ==========================================
function openModal(id) {
  document.getElementById(id).classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  modal.classList.remove('show');
  document.body.style.overflow = '';
}

function closeAllModals() {
  $$('.modal-overlay').forEach(m => m.classList.remove('show'));
  document.body.style.overflow = '';
}

// 点击遮罩关闭
$$('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('show');
      document.body.style.overflow = '';
    }
  });
});

// ==========================================
// Toast 通知
// ==========================================
function showToast(type, message) {
  const container = $('#toastContainer');
  const icons = {
    success: 'fas fa-check-circle',
    warning: 'fas fa-exclamation-triangle',
    error: 'fas fa-times-circle',
    info: 'fas fa-info-circle',
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="${icons[type] || icons.info}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==========================================
// 加载更多
// ==========================================
$('#btnLoadMore')?.addEventListener('click', () => {
  if (RESOURCE_DATA.length === 0) {
    showToast('info', '暂无资源，请先上传');
  } else {
    showToast('info', '已加载全部资源');
  }
});

// ==========================================
// Banner 轮播
// ==========================================
function initBanner() {
  const track = $('#bannerTrack');
  const dotsContainer = $('#bannerDots');

  const slides = [
    { tag: '平台公告', title: '中台支撑资源库正式上线', desc: '统一管理产品资料、技术文档、解决方案，赋能营销、项目、交付全流程。欢迎上传和使用资源。', icon: 'fas fa-rocket', bg: 1 },
    { tag: '使用指南', title: '如何快速上传和管理资源', desc: '点击右上角「上传资源」按钮，选择文件并填写信息即可完成上传。支持拖拽批量上传。', icon: 'fas fa-cloud-upload-alt', bg: 2 },
    { tag: '功能介绍', title: '多维筛选 · 精准定位所需资料', desc: '通过左侧产品分类、顶部书架标签、右侧类别/格式筛选，三重维度快速找到目标资源。', icon: 'fas fa-filter', bg: 3 },
  ];

  // 渲染轮播
  track.innerHTML = slides.map((s, i) => `
    <div class="banner-slide" style="background:${['linear-gradient(135deg,#1A365D,#2B6CB0)','linear-gradient(135deg,#22543D,#38A169)','linear-gradient(135deg,#553C9A,#805AD5)'][i]}">
      <div class="banner-content">
        <div class="banner-tag">${s.tag}</div>
        <div class="banner-title">${s.title}</div>
        <div class="banner-desc">${s.desc}</div>
      </div>
      <i class="${s.icon} banner-decoration"></i>
    </div>
  `).join('');

  // 渲染指示点
  dotsContainer.innerHTML = slides.map((_, i) => `<div class="banner-dot${i === 0 ? ' active' : ''}" data-index="${i}"></div>`).join('');

  let current = 0;
  const total = slides.length;

  function goTo(index) {
    current = (index + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsContainer.querySelectorAll('.banner-dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
  }

  $('#bannerPrev').addEventListener('click', () => goTo(current - 1));
  $('#bannerNext').addEventListener('click', () => goTo(current + 1));

  dotsContainer.querySelectorAll('.banner-dot').forEach(dot => {
    dot.addEventListener('click', () => goTo(parseInt(dot.dataset.index)));
  });

  // 自动轮播
  let autoTimer = setInterval(() => goTo(current + 1), 5000);
  const carousel = $('#bannerCarousel');
  carousel.addEventListener('mouseenter', () => clearInterval(autoTimer));
  carousel.addEventListener('mouseleave', () => {
    autoTimer = setInterval(() => goTo(current + 1), 5000);
  });
}

// ==========================================
// 最新上传列表（Banner右侧）
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
    return `
      <div class="recent-item" onclick="showDetail(RESOURCE_DATA.find(x=>x.id===${r.id}))">
        <div class="ri-icon ${fmt.class}"><i class="${fmt.icon}"></i></div>
        <div class="ri-info">
          <div class="ri-name">${r.title}</div>
          <div class="ri-time">${r.date} · ${r.size}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// 通知系统
// ==========================================
function initNotification() {
  const btn = $('#notificationBtn');
  const dropdown = $('#notifDropdown');
  const badge = $('#notifBadge');
  const clearBtn = $('#notifClearBtn');

  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('show');
  });

  dropdown.addEventListener('click', (e) => e.stopPropagation());

  clearBtn.addEventListener('click', () => {
    badge.textContent = '0';
    badge.style.display = 'none';
    $('#notifBody').innerHTML = '<div class="notif-empty">暂无新通知</div>';
    showToast('success', '已全部标记为已读');
  });

  // 初始状态
  badge.style.display = 'none';
}

// 添加通知（上传成功时调用）
function addNotification(title, type) {
  const body = $('#notifBody');
  const badge = $('#notifBadge');

  // 清空空状态
  const empty = body.querySelector('.notif-empty');
  if (empty) empty.remove();

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

  const item = document.createElement('div');
  item.className = 'notif-item';
  item.innerHTML = `
    <div class="ni-icon ${type || 'upload'}"><i class="fas fa-${type === 'system' ? 'info-circle' : 'cloud-upload-alt'}"></i></div>
    <div>
      <div class="ni-text">${title}</div>
      <div class="ni-time">今天 ${timeStr}</div>
    </div>
  `;
  body.insertBefore(item, body.firstChild);

  const count = parseInt(badge.textContent || '0') + 1;
  badge.textContent = count;
  badge.style.display = 'block';
}

// ==========================================
// 面包屑交互
// ==========================================
function initBreadcrumb() {
  $('.breadcrumb span').forEach(span => {
    span.addEventListener('click', () => {
      if (span.querySelector('.fa-home')) {
        // 点击首页 - 重置所有筛选
        state.currentTab = 'all';
        state.searchQuery = '';
        state.selectedCategories = [];
        state.selectedFormats = [];
        $('.tab').forEach(t => t.classList.remove('active'));
        $('.tab')[0]?.classList.add('active');
        $('.filter-checkbox input').forEach(cb => cb.checked = false);
        $('#globalSearch').value = '';
        renderResources();
        showToast('success', '已返回首页');
      }
    });
  });
}

// ==========================================
// 侧边栏计数更新
// ==========================================
function updateSidebarCounts() {
  $('.nav-link[data-product]').forEach(link => {
    const product = link.dataset.product;
    const count = RESOURCE_DATA.filter(r => r.product === product).length;
    const badge = link.querySelector('.count-badge');
    if (badge) badge.textContent = count;
  });

  $('.nav-link[data-category]').forEach(link => {
    const category = link.dataset.category;
    let count = 0;
    if (category === 'hardware') {
      count = RESOURCE_DATA.filter(r => ['camera','nvr','access','alarm'].includes(r.product)).length;
    } else if (category === 'software') {
      count = RESOURCE_DATA.filter(r => ['isecure','infovision','education','finance','traffic'].includes(r.product)).length;
    } else if (category === 'solution') {
      count = RESOURCE_DATA.filter(r => ['smart-city','smart-park','smart-retail'].includes(r.product)).length;
    } else if (category === 'training') {
      count = RESOURCE_DATA.filter(r => ['tech-training','sales-training'].includes(r.product)).length;
    }
    const badge = link.querySelector('.count-badge');
    if (badge) badge.textContent = count;
  });
}
