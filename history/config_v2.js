/* ============================================
   中台支撑资源库 - 统一配置数据（前后台共享）
   所有菜单、Banner、类别均从此处读取
   后台修改后保存到 localStorage，前台动态渲染
   ============================================ */

const CONFIG_STORAGE_KEY = 'resourceCenter_config';

// 默认配置（首次使用时初始化）
const DEFAULT_CONFIG = {

  // ==========================================
  // 前台侧边栏产品资料菜单树
  // ==========================================
  menuTree: [
    {
      id: 'hardware',
      name: '硬件产品',
      icon: 'fas fa-microchip',
      children: [
        { id: 'camera', name: '智能摄像机系列', icon: 'fas fa-video' },
        { id: 'nvr', name: '网络硬盘录像机', icon: 'fas fa-server' },
        { id: 'access', name: '门禁控制设备', icon: 'fas fa-door-open' },
        { id: 'alarm', name: '报警探测设备', icon: 'fas fa-bell' },
      ]
    },
    {
      id: 'software',
      name: '软件平台',
      icon: 'fas fa-cube',
      children: [
        { id: 'isecure', name: 'iSecure Center 综合安防管理平台', icon: 'fas fa-shield-halved' },
        { id: 'infovision', name: 'Infovision AR 实景地图平台', icon: 'fas fa-map-location-dot' },
        { id: 'education', name: '教育综合安防管理平台', icon: 'fas fa-graduation-cap' },
        { id: 'finance', name: '金融综合安防管理平台', icon: 'fas fa-building-columns' },
        { id: 'traffic', name: '交通综合管控平台', icon: 'fas fa-traffic-light' },
      ]
    },
    {
      id: 'solution',
      name: '解决方案',
      icon: 'fas fa-lightbulb',
      children: [
        { id: 'smart-city', name: '智慧城市方案', icon: 'fas fa-city' },
        { id: 'smart-park', name: '智慧园区方案', icon: 'fas fa-tree-city' },
        { id: 'smart-retail', name: '智慧零售方案', icon: 'fas fa-store' },
      ]
    },
    {
      id: 'training',
      name: '培训资料',
      icon: 'fas fa-chalkboard-user',
      children: [
        { id: 'tech-training', name: '技术培训', icon: 'fas fa-wrench' },
        { id: 'sales-training', name: '销售培训', icon: 'fas fa-handshake' },
      ]
    },
  ],

  // ==========================================
  // Banner 轮播配置
  // ==========================================
  banners: [
    {
      id: 'b1',
      tag: '平台公告',
      title: '中台支撑资源库正式上线',
      desc: '统一管理产品资料、技术文档、解决方案，赋能营销、项目、交付全流程。欢迎上传和使用资源。',
      icon: 'fas fa-rocket',
      gradient: 'linear-gradient(135deg, #1A365D, #2B6CB0)',
      enabled: true,
      sort: 1,
    },
    {
      id: 'b2',
      tag: '使用指南',
      title: '如何快速上传和管理资源',
      desc: '点击右上角「上传资源」按钮，选择文件并填写信息即可完成上传。支持拖拽批量上传。',
      icon: 'fas fa-cloud-upload-alt',
      gradient: 'linear-gradient(135deg, #22543D, #38A169)',
      enabled: true,
      sort: 2,
    },
    {
      id: 'b3',
      tag: '功能介绍',
      title: '多维筛选 · 精准定位所需资料',
      desc: '通过左侧产品分类、顶部书架标签、右侧类别/格式筛选，三重维度快速找到目标资源。',
      icon: 'fas fa-filter',
      gradient: 'linear-gradient(135deg, #553C9A, #805AD5)',
      enabled: true,
      sort: 3,
    },
  ],

  // ==========================================
  // 资源类别配置
  // ==========================================
  categories: [
    { id: 'product-detail', name: '商品详情页', icon: 'fas fa-file-lines', enabled: true, sort: 1 },
    { id: 'product-spec', name: '产品SPEC(彩页)', icon: 'fas fa-palette', enabled: true, sort: 2 },
    { id: 'product-plan', name: '产品方案', icon: 'fas fa-diagram-project', enabled: true, sort: 3 },
    { id: 'install-guide', name: '安装指南', icon: 'fas fa-screwdriver-wrench', enabled: true, sort: 4 },
    { id: 'user-manual', name: '用户手册', icon: 'fas fa-book', enabled: true, sort: 5 },
    { id: 'config-guide', name: '配置指南', icon: 'fas fa-sliders', enabled: true, sort: 6 },
    { id: 'release-note', name: '版本说明', icon: 'fas fa-code-branch', enabled: true, sort: 7 },
    { id: 'api-doc', name: 'API文档', icon: 'fas fa-code', enabled: true, sort: 8 },
    { id: 'white-paper', name: '白皮书', icon: 'fas fa-scroll', enabled: true, sort: 9 },
  ],

  // ==========================================
  // 书架标签配置
  // ==========================================
  shelves: [
    { id: 'all', name: '全部资源', icon: 'fas fa-layer-group', enabled: true, sort: 0 },
    { id: 'marketing', name: '营销书架', icon: 'fas fa-bullhorn', enabled: true, sort: 1 },
    { id: 'project', name: '项目书架', icon: 'fas fa-folder-open', enabled: true, sort: 2 },
    { id: 'delivery', name: '交付书架', icon: 'fas fa-truck', enabled: true, sort: 3 },
    { id: 'cases', name: '案例书架', icon: 'fas fa-trophy', enabled: true, sort: 4 },
  ],

  // ==========================================
  // 文件格式配置
  // ==========================================
  formats: [
    { id: 'pdf', name: 'PDF', icon: 'fas fa-file-pdf', color: '#E53E3E', enabled: true },
    { id: 'word', name: 'Word', icon: 'fas fa-file-word', color: '#2B6CB0', enabled: true },
    { id: 'excel', name: 'Excel', icon: 'fas fa-file-excel', color: '#38A169', enabled: true },
    { id: 'ppt', name: 'PPT', icon: 'fas fa-file-powerpoint', color: '#D69E2E', enabled: true },
    { id: 'video', name: '视频', icon: 'fas fa-file-video', color: '#805AD5', enabled: true },
    { id: 'image', name: '图片', icon: 'fas fa-file-image', color: '#ED8936', enabled: true },
    { id: 'zip', name: '压缩包', icon: 'fas fa-file-zipper', color: '#718096', enabled: true },
  ],
};

// ==========================================
// 配置读写工具函数
// ==========================================
function loadConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 合并默认值（防止新增字段丢失）
      return Object.assign({}, DEFAULT_CONFIG, parsed);
    }
  } catch (e) {
    console.warn('配置加载失败，使用默认配置', e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function saveConfig(config) {
  try {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error('配置保存失败', e);
    return false;
  }
}

function resetConfig() {
  localStorage.removeItem(CONFIG_STORAGE_KEY);
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

// 生成唯一ID
function genId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// 获取所有产品ID到名称的映射（从菜单树展平）
function getProductMap(config) {
  const map = {};
  (config.menuTree || []).forEach(group => {
    map[group.id] = group.name;
    (group.children || []).forEach(child => {
      map[child.id] = child.name;
    });
  });
  return map;
}

// 获取所有类别ID到名称的映射
function getCategoryMap(config) {
  const map = {};
  (config.categories || []).forEach(c => {
    map[c.id] = c.name;
  });
  return map;
}
