/* ============================================
   捷顺科技 · 中台支撑资源库 - 前台逻辑
   ============================================ */

const RESOURCE_STORAGE_KEY = 'resourceCenter_resources';
function loadResources() { try { const s = localStorage.getItem(RESOURCE_STORAGE_KEY); return s ? JSON.parse(s) : []; } catch(e) { return []; } }
function saveResources(data) { localStorage.setItem(RESOURCE_STORAGE_KEY, JSON.stringify(data)); }

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

let state = { currentView:'list', currentSort:'newest', currentTab:'all', selectedProduct:'', selectedCategories:[], selectedFormats:[], searchQuery:'', favorites:new Set(), uploadedFiles:[], tags:[] };
let APP_CONFIG = null;
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ==========================================
// 登录
// ==========================================
function checkAuth() {
  const u = localStorage.getItem('resourceCenter_user');
  if (!u) { window.location.href = 'login.html'; return null; }
  return JSON.parse(u);
}

function initUserInfo() {
  const user = checkAuth();
  if (!user) return;
  const el = $('#userAvatarBtn');
  if (!el) return;
  const ch = user.name ? user.name.charAt(0) : '用';
  el.innerHTML = `
    <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%233B82F6'/%3E%3Ctext x='20' y='25' text-anchor='middle' fill='white' font-size='15' font-weight='bold'%3E${encodeURIComponent(ch)}%3C/text%3E%3C/svg%3E" alt="">
    <span>${user.name}</span>
    <div class="user-dropdown" id="userDropdown">
      <div class="user-dropdown-header"><strong>${user.name}</strong><span class="user-role-badge">${user.role}</span></div>
      <div class="user-dropdown-divider"></div>
      <div class="user-dropdown-item" onclick="window.location.href='admin.html'"><i class="fas fa-gauge-high"></i> 后台管理</div>
      <div class="user-dropdown-item" onclick="showToast('info','个人设置开发中')"><i class="fas fa-gear"></i> 个人设置</div>
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
// 侧边栏
// ==========================================
function renderSidebar() {
  const tree = $('#navTree');
  if (!tree) return;
  const menuTree = APP_CONFIG.menuTree || [];

  tree.innerHTML = menuTree.map((group, gi) => {
    const childCount = RESOURCE_DATA.filter(r => (group.children||[]).some(c => c.id === r.product)).length;
    const childrenHtml = (group.children||[]).map(child => {
      const cnt = RESOURCE_DATA.filter(r => r.product === child.id).length;
      return `<li class="nav-item"><div class="nav-link" data-product="${child.id}"><i class="${child.icon||'fas fa-file'} cat-icon"></i><span>${child.name}</span><span class="count-badge">${cnt}</span></div></li>`;
    }).join('');
    return `<li class="nav-item has-children${gi===0?' expanded':''}">
      <div class="nav-link" data-category="${group.id}"><i class="fas fa-chevron-right toggle-icon"></i><i class="${group.icon||'fas fa-folder'} cat-icon"></i><span>${group.name}</span><span class="count-badge">${childCount}</span></div>
      <ul class="sub-nav">${childrenHtml}</ul></li>`;
  }).join('');

  tree.querySelectorAll('.has-children > .nav-link').forEach(link => {
    link.addEventListener('click', () => link.parentElement.classList.toggle('expanded'));
  });

  tree.querySelectorAll('.nav-link[data-product]').forEach(link => {
    link.addEventListener('click', e => {
      e.stopPropagation();
      tree.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      state.selectedProduct = link.dataset.product;
      renderResources();
    });
  });

  // 侧边栏搜索
  $('#sidebarSearch')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    tree.querySelectorAll('.nav-item').forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(q) ? '' : 'none';
    });
  });

  // 更新统计
  $('#statTotal').textContent = RESOURCE_DATA.length;
  const today = new Date().toISOString().slice(0,10);
  $('#statToday').textContent = RESOURCE_DATA.filter(r => r.date === today).length;
}

// ==========================================
// 书架标签
// ==========================================
function renderTabs() {
  const bar = $('#tabsBar');
  if (!bar) return;
  const shelves = (APP_CONFIG.shelves||[]).filter(s=>s.enabled).sort((a,b)=>a.sort-b.sort);
  bar.innerHTML = shelves.map(s => `<button class="tab${s.id===state.currentTab?' active':''}" data-tab="${s.id}"><i class="${s.icon}"></i> ${s.name}</button>`).join('');
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
// 筛选
// ==========================================
function renderFilters() {
  const catBox = $('#filterCategories');
  const fmtBox = $('#filterFormats');
  if (!catBox || !fmtBox) return;
  const categories = (APP_CONFIG.categories||[]).filter(c=>c.enabled).sort((a,b)=>a.sort-b.sort);
  const formats = (APP_CONFIG.formats||[]).filter(f=>f.enabled);
  catBox.innerHTML = categories.map(c => `<label class="filter-checkbox"><input type="checkbox" value="${c.id}"> <span>${c.name}</span></label>`).join('');
  fmtBox.innerHTML = formats.map(f => `<label class="filter-checkbox"><input type="checkbox" value="${f.id}"> <span>${f.name}</span></label>`).join('');

  catBox.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => { state.selectedCategories = Array.from(catBox.querySelectorAll('input:checked')).map(i=>i.value); renderResources(); }));
  fmtBox.querySelectorAll('input').forEach(cb => cb.addEventListener('change', () => { state.selectedFormats = Array.from(fmtBox.querySelectorAll('input:checked')).map(i=>i.value); renderResources(); }));

  $('#btnClearCategory')?.addEventListener('click', () => { catBox.querySelectorAll('input').forEach(cb=>cb.checked=false); state.selectedCategories=[]; renderResources(); });
  $('#btnClearFormat')?.addEventListener('click', () => { fmtBox.querySelectorAll('input').forEach(cb=>cb.checked=false); state.selectedFormats=[]; renderResources(); });
}

// ==========================================
// 上传表单
// ==========================================
function renderUploadSelects() {
  const prodSel=$('#uploadProduct'), catSel=$('#uploadCategory'), shelfSel=$('#uploadShelf'), fmtSel=$('#uploadFormat');
  if (prodSel) {
    let h='<option value="">请选择产品</option>';
    (APP_CONFIG.menuTree||[]).forEach(g => { h+=`<optgroup label="${g.name}">`; (g.children||[]).forEach(c => { h+=`<option value="${c.id}">${c.name}</option>`; }); h+='</optgroup>'; });
    prodSel.innerHTML = h;
  }
  if (catSel) { let h='<option value="">请选择类别</option>'; (APP_CONFIG.categories||[]).filter(c=>c.enabled).sort((a,b)=>a.sort-b.sort).forEach(c => { h+=`<option value="${c.id}">${c.name}</option>`; }); catSel.innerHTML=h; }
  if (shelfSel) { let h='<option value="">请选择书架</option>'; (APP_CONFIG.shelves||[]).filter(s=>s.enabled&&s.id!=='all').sort((a,b)=>a.sort-b.sort).forEach(s => { h+=`<option value="${s.id}">${s.name}</option>`; }); shelfSel.innerHTML=h; }
  if (fmtSel) { let h='<option value="">自动识别</option>'; (APP_CONFIG.formats||[]).filter(f=>f.enabled).forEach(f => { h+=`<option value="${f.id}">${f.name}</option>`; }); fmtSel.innerHTML=h; }
  prodSel?.addEventListener('change', () => {
    const val=prodSel.value; if(!val){$('#uploadPath').value='/resources/';return;}
    let bp='/resources/'; for(const g of APP_CONFIG.menuTree){if((g.children||[]).some(c=>c.id===val)){bp+=g.id+'/';break;}} bp+=val+'/'; $('#uploadPath').value=bp;
  });
}

// ==========================================
// Banner
// ==========================================
function renderBanner() {
  const track=$('#bannerTrack'), dotsC=$('#bannerDots');
  if(!track||!dotsC) return;
  const banners=(APP_CONFIG.banners||[]).filter(b=>b.enabled).sort((a,b)=>a.sort-b.sort);
  if(banners.length===0){track.innerHTML='<div class="banner-slide" style="background:linear-gradient(135deg,#1e3a5f,#3b82f6)"><div class="banner-content"><div class="banner-title">欢迎使用捷顺科技中台支撑资源库</div><div class="banner-desc">请在后台管理中配置Banner内容</div></div></div>';dotsC.innerHTML='';return;}
  track.innerHTML=banners.map(b=>`<div class="banner-slide" style="background:${b.gradient||'linear-gradient(135deg,#1e3a5f,#3b82f6)'}"><div class="banner-content"><div class="banner-tag">${b.tag||''}</div><div class="banner-title">${b.title}</div><div class="banner-desc">${b.desc||''}</div></div><i class="${b.icon||'fas fa-star'} banner-decoration"></i></div>`).join('');
  dotsC.innerHTML=banners.map((_,i)=>`<div class="banner-dot${i===0?' active':''}" data-index="${i}"></div>`).join('');
  let cur=0; const tot=banners.length;
  function goTo(idx){cur=(idx+tot)%tot;track.style.transform=`translateX(-${cur*100}%)`;dotsC.querySelectorAll('.banner-dot').forEach((d,i)=>d.classList.toggle('active',i===cur));}
  $('#bannerPrev')?.addEventListener('click',()=>goTo(cur-1));
  $('#bannerNext')?.addEventListener('click',()=>goTo(cur+1));
  dotsC.querySelectorAll('.banner-dot').forEach(d=>d.addEventListener('click',()=>goTo(+d.dataset.index)));
  let timer=setInterval(()=>goTo(cur+1),5000);
  const carousel=$('#bannerCarousel');
  carousel?.addEventListener('mouseenter',()=>clearInterval(timer));
  carousel?.addEventListener('mouseleave',()=>{timer=setInterval(()=>goTo(cur+1),5000);});
}

// ==========================================
// 快捷统计
// ==========================================
function updateQuickStats() {
  $('#qsTotal').textContent = RESOURCE_DATA.length;
  $('#qsDownloads').textContent = RESOURCE_DATA.reduce((s,r)=>s+r.downloads,0);
  $('#qsCategories').textContent = (APP_CONFIG.categories||[]).filter(c=>c.enabled).length;
  const week = new Date(); week.setDate(week.getDate()-7);
  const weekStr = week.toISOString().slice(0,10);
  $('#qsRecent').textContent = RESOURCE_DATA.filter(r=>r.date>=weekStr).length;
}

// ==========================================
// 资源渲染
// ==========================================
function renderResources() {
  let filtered=[...RESOURCE_DATA];
  const productMap=getProductMap(APP_CONFIG), categoryMap=getCategoryMap(APP_CONFIG);
  if(state.currentTab!=='all') filtered=filtered.filter(r=>r.shelf===state.currentTab);
  if(state.selectedProduct) filtered=filtered.filter(r=>r.product===state.selectedProduct);
  if(state.selectedCategories.length>0) filtered=filtered.filter(r=>state.selectedCategories.includes(r.category));
  if(state.selectedFormats.length>0) filtered=filtered.filter(r=>state.selectedFormats.includes(r.format));
  if(state.searchQuery){const q=state.searchQuery.toLowerCase();filtered=filtered.filter(r=>r.title.toLowerCase().includes(q)||(r.description||'').toLowerCase().includes(q)||(r.tags||[]).some(t=>t.toLowerCase().includes(q)));}
  if(state.currentSort==='newest') filtered.sort((a,b)=>b.date.localeCompare(a.date));
  else if(state.currentSort==='downloads') filtered.sort((a,b)=>b.downloads-a.downloads);
  else if(state.currentSort==='name') filtered.sort((a,b)=>a.title.localeCompare(b.title));

  $('#resultCount').textContent=filtered.length;
  const listEl=$('#resourceList');
  if(!listEl) return;

  if(filtered.length===0){
    listEl.innerHTML=`<div class="empty-state">
      <div class="empty-icon"><i class="fas fa-folder-open"></i></div>
      <h4>暂无匹配的资源</h4>
      <p>请尝试调整筛选条件，或上传新的资源文件</p>
      <button class="btn-empty-upload" onclick="openModal('uploadModal')"><i class="fas fa-cloud-upload-alt"></i> 上传资源</button>
    </div>`;
    $('.pagination-info').textContent='';
    return;
  }

  if(state.currentView==='grid'){
    listEl.className='resource-list grid-view';
    listEl.innerHTML=filtered.map(r=>{const fmt=FORMAT_ICONS[r.format]||FORMAT_ICONS.pdf;return`<div class="resource-card" onclick="showDetail(RESOURCE_DATA.find(x=>x.id===${r.id}))"><div class="card-icon ${fmt.class}"><i class="${fmt.icon}"></i></div><div class="card-title">${r.title}</div><div class="card-meta"><span>${categoryMap[r.category]||r.category}</span><span>${r.size}</span></div><div class="card-footer"><span><i class="fas fa-download"></i> ${r.downloads}</span><span>${r.date}</span></div></div>`;}).join('');
  } else {
    listEl.className='resource-list';
    listEl.innerHTML=filtered.map(r=>{const fmt=FORMAT_ICONS[r.format]||FORMAT_ICONS.pdf;const isFav=state.favorites.has(r.id);return`<div class="resource-item"><div class="item-icon ${fmt.class}"><i class="${fmt.icon}"></i></div><div class="item-info" onclick="showDetail(RESOURCE_DATA.find(x=>x.id===${r.id}))"><div class="item-title">${r.title}</div><div class="item-meta"><span class="meta-tag product"><i class="fas fa-cube"></i> ${productMap[r.product]||r.product}</span><span class="meta-tag category"><i class="fas fa-tag"></i> ${categoryMap[r.category]||r.category}</span>${r.version?'<span class="meta-tag version">'+r.version+'</span>':''}</div></div><div class="item-stats"><span><i class="fas fa-download"></i> ${r.downloads}</span><span><i class="fas fa-hdd"></i> ${r.size}</span><span><i class="fas fa-calendar"></i> ${r.date}</span></div><div class="item-actions"><button class="action-btn ${isFav?'active':''}" title="收藏" onclick="toggleFav(${r.id})"><i class="fas fa-star"></i></button><button class="action-btn" title="下载" onclick="downloadResource(${r.id})"><i class="fas fa-download"></i></button></div></div>`;}).join('');
  }
  $('.pagination-info').textContent=`显示 ${filtered.length} / 共 ${RESOURCE_DATA.length} 条`;
}

// ==========================================
// 操作
// ==========================================
function showDetail(resource) {
  if(!resource) return;
  const productMap=getProductMap(APP_CONFIG), categoryMap=getCategoryMap(APP_CONFIG);
  const fmt=FORMAT_ICONS[resource.format]||FORMAT_ICONS.pdf;
  $('#detailTitle').textContent=resource.title;
  $('#detailBody').innerHTML=`<div class="detail-header-info"><div class="detail-icon ${fmt.class}"><i class="${fmt.icon}"></i></div><div class="detail-meta-grid"><div class="meta-item"><label>所属产品</label><span>${productMap[resource.product]||resource.product}</span></div><div class="meta-item"><label>资料类别</label><span>${categoryMap[resource.category]||resource.category}</span></div><div class="meta-item"><label>版本号</label><span>${resource.version||'--'}</span></div><div class="meta-item"><label>文件大小</label><span>${resource.size}</span></div><div class="meta-item"><label>上传日期</label><span>${resource.date}</span></div><div class="meta-item"><label>下载次数</label><span>${resource.downloads}</span></div><div class="meta-item"><label>存储路径</label><span>${resource.path||'--'}</span></div></div></div><div class="detail-desc"><h4>资源描述</h4><p>${resource.description||'暂无描述'}</p></div>${resource.tags&&resource.tags.length?'<div class="detail-tags"><h4>标签</h4><div>'+resource.tags.map(t=>'<span class="tag">'+t+'</span>').join('')+'</div></div>':''}`;
  openModal('detailModal');
}

function toggleFav(id) { if(state.favorites.has(id)){state.favorites.delete(id);showToast('info','已取消收藏');}else{state.favorites.add(id);showToast('success','已收藏');} renderResources(); }
function downloadResource(id) { const r=RESOURCE_DATA.find(x=>x.id===id); if(r){r.downloads++;saveResources(RESOURCE_DATA);} showToast('success','开始下载...'); renderResources(); updateQuickStats(); }

// ==========================================
// 上传
// ==========================================
function initUpload() {
  const zone=$('#uploadZone'), input=$('#fileInput');
  zone?.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover');});
  zone?.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
  zone?.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragover');handleFiles(e.dataTransfer.files);});
  input?.addEventListener('change',()=>handleFiles(input.files));
  $('#btnUploadHeader')?.addEventListener('click',()=>openModal('uploadModal'));
  $('#btnSubmitUpload')?.addEventListener('click',submitUpload);
}

function handleFiles(files) {
  const list=$('#uploadFileList'); if(!list) return;
  state.uploadedFiles=Array.from(files);
  list.innerHTML=state.uploadedFiles.map((f,i)=>{
    const ext=f.name.split('.').pop().toLowerCase();
    const fk={pdf:'pdf',doc:'word',docx:'word',xls:'excel',xlsx:'excel',ppt:'ppt',pptx:'ppt',mp4:'video',avi:'video',mov:'video',jpg:'image',jpeg:'image',png:'image',gif:'image',zip:'zip',rar:'zip','7z':'zip'}[ext]||'pdf';
    const fmt=FORMAT_ICONS[fk];
    return`<div class="upload-file-item"><div class="ufi-icon ${fmt.class}"><i class="${fmt.icon}"></i></div><div class="ufi-info"><div class="ufi-name">${f.name}</div><div class="ufi-size">${(f.size/1024/1024).toFixed(2)} MB</div></div><button class="ufi-remove" onclick="removeFile(${i})"><i class="fas fa-times"></i></button></div>`;
  }).join('');
  if(state.uploadedFiles.length>0&&!$('#uploadName').value){
    const fn=state.uploadedFiles[0].name;$('#uploadName').value=fn.substring(0,fn.lastIndexOf('.'));
    const ext=fn.split('.').pop().toLowerCase();
    const fk={pdf:'pdf',doc:'word',docx:'word',xls:'excel',xlsx:'excel',ppt:'ppt',pptx:'ppt',mp4:'video',avi:'video',mov:'video',jpg:'image',jpeg:'image',png:'image',gif:'image',zip:'zip',rar:'zip','7z':'zip'}[ext]||'';
    if(fk) $('#uploadFormat').value=fk;
  }
}

function removeFile(idx){state.uploadedFiles.splice(idx,1);handleFiles(state.uploadedFiles);}

function submitUpload() {
  const name=$('#uploadName').value.trim(), product=$('#uploadProduct').value, category=$('#uploadCategory').value, shelf=$('#uploadShelf').value, format=$('#uploadFormat').value||'pdf', version=$('#uploadVersion').value.trim(), desc=$('#uploadDesc').value.trim(), path=$('#uploadPath').value;
  if(!name){showToast('error','请输入资源名称');return;} if(!product){showToast('error','请选择所属产品');return;} if(!category){showToast('error','请选择资料类别');return;} if(!shelf){showToast('error','请选择书架归属');return;}
  const totalSize=state.uploadedFiles.reduce((s,f)=>s+f.size,0);
  const sizeStr=totalSize>0?(totalSize/1024/1024).toFixed(1)+'MB':'0MB';
  const today=new Date().toISOString().slice(0,10);
  RESOURCE_DATA.unshift({id:Date.now(),title:name,category,format,shelf,product,version,size:sizeStr,date:today,downloads:0,path,description:desc,tags:[...state.tags]});
  saveResources(RESOURCE_DATA);
  showToast('success',`资源「${name}」上传成功`);
  addNotification(`资源「${name}」上传成功`,'upload');
  $('#uploadName').value='';$('#uploadVersion').value='';$('#uploadProduct').value='';$('#uploadCategory').value='';$('#uploadShelf').value='';$('#uploadFormat').value='';$('#uploadPath').value='/resources/';$('#uploadDesc').value='';
  state.uploadedFiles=[];state.tags=[];$('#uploadFileList').innerHTML='';$('#tagList').innerHTML='';
  closeModal('uploadModal');renderResources();renderSidebar();updateQuickStats();
}

// ==========================================
// 标签
// ==========================================
function initTagInput() {
  const input=$('#tagInput'); if(!input) return;
  input.addEventListener('keydown',e=>{if(e.key==='Enter'&&input.value.trim()){e.preventDefault();const tag=input.value.trim();if(!state.tags.includes(tag)){state.tags.push(tag);renderTagList();}input.value='';}});
}
function renderTagList(){const list=$('#tagList');if(!list)return;list.innerHTML=state.tags.map((t,i)=>`<span class="tag-item">${t} <i class="fas fa-times" onclick="removeTag(${i})"></i></span>`).join('');}
function removeTag(idx){state.tags.splice(idx,1);renderTagList();}

// ==========================================
// 搜索 / 排序 / 视图
// ==========================================
function initSearch() {
  const input=$('#globalSearch'); if(!input) return;
  let timer;
  input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{state.searchQuery=input.value.trim();renderResources();},300);});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();input.focus();}});
}
function initSort(){$('#sortSelect')?.addEventListener('change',e=>{state.currentSort=e.target.value;renderResources();});}
function initViewToggle(){$$('.view-btn').forEach(btn=>{btn.addEventListener('click',()=>{$$('.view-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');state.currentView=btn.dataset.view;renderResources();});});}

// ==========================================
// 通知
// ==========================================
function initNotification() {
  const btn=$('#notificationBtn'),dropdown=$('#notifDropdown'),badge=$('#notifBadge'),clearBtn=$('#notifClearBtn');
  if(!btn) return;
  btn.addEventListener('click',e=>{e.stopPropagation();dropdown.classList.toggle('show');});
  document.addEventListener('click',()=>dropdown.classList.remove('show'));
  dropdown.addEventListener('click',e=>e.stopPropagation());
  clearBtn?.addEventListener('click',()=>{badge.textContent='0';badge.style.display='none';$('#notifBody').innerHTML='<div class="notif-empty"><i class="fas fa-bell-slash"></i><p>暂无新通知</p></div>';showToast('success','已全部标记为已读');});
  badge.style.display='none';
}

function addNotification(title,type){
  const body=$('#notifBody'),badge=$('#notifBadge');
  const empty=body?.querySelector('.notif-empty');if(empty)empty.remove();
  const now=new Date();const ts=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const item=document.createElement('div');item.className='notif-item';
  item.innerHTML=`<div class="ni-icon ${type||'upload'}"><i class="fas fa-${type==='system'?'info-circle':'cloud-upload-alt'}"></i></div><div><div class="ni-text">${title}</div><div class="ni-time">今天 ${ts}</div></div>`;
  body.insertBefore(item,body.firstChild);
  const count=parseInt(badge.textContent||'0')+1;badge.textContent=count;badge.style.display='block';
}

// ==========================================
// 弹窗 / Toast
// ==========================================
function openModal(id){const m=document.getElementById(id);if(m){m.classList.add('show');document.body.style.overflow='hidden';}}
function closeModal(id){const m=document.getElementById(id);if(m){m.classList.remove('show');document.body.style.overflow='';}}
$$('.modal-overlay').forEach(o=>{o.addEventListener('click',e=>{if(e.target===o){o.classList.remove('show');document.body.style.overflow='';}});});

function showToast(type,msg){
  const c=$('#toastContainer');if(!c)return;
  const icons={success:'fas fa-check-circle',error:'fas fa-times-circle',info:'fas fa-info-circle',warning:'fas fa-exclamation-triangle'};
  const t=document.createElement('div');t.className=`toast-item ${type}`;t.innerHTML=`<i class="${icons[type]||icons.info}"></i><span>${msg}</span>`;
  c.appendChild(t);setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),300);},3000);
}

$('#btnLoadMore')?.addEventListener('click',()=>{if(RESOURCE_DATA.length===0)showToast('info','暂无资源');else showToast('info','已加载全部');});

// ==========================================
// 初始化
// ==========================================
document.addEventListener('DOMContentLoaded',()=>{
  APP_CONFIG=loadConfig();
  initUserInfo();
  renderSidebar();
  renderTabs();
  renderFilters();
  renderUploadSelects();
  renderBanner();
  updateQuickStats();
  initSort();
  initViewToggle();
  initSearch();
  initUpload();
  initTagInput();
  initNotification();
  renderResources();
});
