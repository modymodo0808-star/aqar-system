// بنجيب اليوزر من المتصفح لو كان مسجل دخول قبل كده
let currentUser = DataAPI.getCurrentUser(); 

window.onload = async () => {
  // لو فيه يوزر متسجل، ندخله الموقع علطول
  if (currentUser) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('currentUser').textContent = '👤 ' + currentUser.name;
    
    if (currentUser.role !== 'admin') {
      document.querySelectorAll('.admin-only').forEach(el => el.classList.add('admin-hidden'));
      document.querySelectorAll('.sales-only').forEach(el => el.classList.remove('admin-hidden'));
    } else {
      document.querySelectorAll('.sales-only').forEach(el => el.classList.add('admin-hidden'));
    }
    
    await renderAll();
  }
};

async function doLogin() {
  const u = document.getElementById('loginUser').value.trim();
  const p = document.getElementById('loginPass').value.trim();
  const user = await DataAPI.login(u, p);
  if (!user) { document.getElementById('loginError').textContent = 'بيانات الدخول غير صحيحة'; return; }
  currentUser = user;
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('currentUser').textContent = '👤 ' + user.name;
  
  if (currentUser.role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('admin-hidden'));
    document.querySelectorAll('.sales-only').forEach(el => el.classList.remove('admin-hidden'));
  } else {
    document.querySelectorAll('.sales-only').forEach(el => el.classList.add('admin-hidden'));
  }
  
  await renderAll();
}

function doLogout() { 
  DataAPI.logout(); 
  currentUser = null; 
  location.reload(); 
}

document.querySelectorAll('.nav-item').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    a.classList.add('active');
    const page = a.dataset.page;
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById('page-' + page).classList.remove('hidden');
    const titles = { 
      dashboard: 'لوحة التحكم', 
      units: 'الشقق والعقارات', 
      owners: 'الملاك', 
      clients: 'العملاء والمتابعات', 
      team: 'فريق السيلز',
      'my-clients': 'متابعاتي (الأرقام)'
    };
    document.getElementById('pageTitle').textContent = titles[page] || 'الصفحة';
  });
});

function openModal(title, bodyHTML, onSave) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modal').classList.remove('hidden');
  const saveBtn = document.getElementById('modalSave');
  saveBtn.style.display = 'block';
  const newBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newBtn, saveBtn);
  newBtn.addEventListener('click', onSave);
}
function closeModal() { document.getElementById('modal').classList.add('hidden'); }

async function renderAll() {
  await renderDashboard();
  await renderUnits();
  await renderTodos();
  
  if (currentUser && currentUser.role === 'admin') {
    await renderOwners();
    await renderClients();
    await renderTeam();
  } else {
    await renderMyClients();
  }
}

async function renderDashboard() {
  const units = await DataAPI.getUnits();
  document.getElementById('statTotal').textContent = units.length;
  document.getElementById('statAvailable').textContent = units.filter(u => u.status === 'متاحة').length;
  document.getElementById('statSold').textContent = units.filter(u => u.status === 'مبيعة').length;
  document.getElementById('statRented').textContent = units.filter(u => u.status === 'مؤجرة').length;

  const recent = units.slice(-4).reverse();
  document.getElementById('recentUnits').innerHTML = recent.map(u => `
    <tr>
      <td>#${u.id ? u.id.slice(-4) : ''}</td>
      <td>${u.project}</td>
      <td>${u.size} م²</td>
      <td>${u.price.toLocaleString()} ج.م</td>
      <td><span class="badge ${u.status}">${u.status}</span></td>
    </tr>
  `).join('');
}

async function renderTodos() {
  const todos = await DataAPI.getTodos();
  document.getElementById('todoList').innerHTML = todos.map(t => `
    <li>${t.text} <span onclick="removeTodo('${t.id}')">✕</span></li>
  `).join('') || '<li style="justify-content:center;color:#94a3b8">لا توجد مهام حالياً</li>';
}
async function addTodo() {
  const input = document.getElementById('todoInput');
  if (!input.value.trim()) return;
  await DataAPI.addTodo(input.value.trim());
  input.value = '';
  await renderTodos();
}
async function removeTodo(id) { await DataAPI.deleteTodo(id); await renderTodos(); }

// دالة البحث بالمساحة والسعر
async function renderUnits() {
  const search = (document.getElementById('unitSearch')?.value || '').trim().toLowerCase();
  const fStatus = document.getElementById('unitFilterStatus')?.value || '';
  const fDeal = document.getElementById('unitFilterDeal')?.value || '';
  let units = await DataAPI.getUnits();
  
  if (search) {
    units = units.filter(u => {
      if (!isNaN(search) && search !== '') {
        return String(u.size).includes(search) || String(u.price).includes(search);
      }
      return u.project.toLowerCase().includes(search) || 
             u.area.toLowerCase().includes(search) || 
             String(u.id).includes(search);
    });
  }

  if (fStatus) units = units.filter(u => u.status === fStatus);
  if (fDeal) units = units.filter(u => u.dealType === fDeal);

  const actionButtons = (id) => {
    if (currentUser.role === 'admin') {
      return `
        <button class="btn-edit" onclick="openUnitForm('${id}')">تعديل</button>
        <button class="btn-danger" onclick="removeUnit('${id}')">حذف</button>
      `;
    }
    return '';
  };

  document.getElementById('unitsBody').innerHTML = units.map(u => `
    <tr>
      <td>#${u.id ? u.id.slice(-4) : ''}</td>
      <td><strong>${u.project}</strong><br><small style="color:#64748b;font-weight:500">${u.area}</small></td>
      <td>${u.dealType}</td>
      <td>${u.size} م²</td>
      <td>${u.price.toLocaleString()}</td>
      <td><span class="badge ${u.status}">${u.status}</span></td>
      <td class="admin-only">${u.addedBy ? u.addedBy : 'المدير'}</td>
      <td>
        <button class="btn-view" onclick="viewUnit('${u.id}')">تفاصيل</button>
        ${actionButtons(u.id)}
      </td>
    </tr>
  `).join('') || '<tr><td colspan="8" style="text-align:center;color:#94a3b8;padding:20px">لا توجد نتائج مطابقة</td></tr>';
}

async function viewUnit(id) {
  const units = await DataAPI.getUnits();
  const u = units.find(x => String(x.id) === String(id));
  if (!u) return;
  
  document.getElementById('detailProjectName').textContent = u.project + ' - ' + u.area;
  document.getElementById('detailPrice').textContent = u.price.toLocaleString() + ' ج.م';
  document.getElementById('detailStatus').textContent = u.status;
  document.getElementById('detailStatus').className = 'badge ' + u.status;
  document.getElementById('detailDealType').textContent = u.dealType;
  
  document.getElementById('detailArea').textContent = u.area;
  document.getElementById('detailBuilding').textContent = u.building || '—';
  document.getElementById('detailFloor').textContent = u.floor || '—';
  document.getElementById('detailUnitNo').textContent = u.unitNo || '—';
  document.getElementById('detailSize').textContent = u.size + ' م²';
  document.getElementById('detailRooms').textContent = u.rooms;
  document.getElementById('detailBaths').textContent = u.baths;
  
  if (currentUser.role === 'admin') {
    document.getElementById('detailOwner').textContent = await DataAPI.getOwnerName(u.ownerId);
    document.getElementById('detailPartiesSection').classList.remove('admin-hidden');
  } else {
    document.getElementById('detailPartiesSection').classList.add('admin-hidden');
  }
  
  document.getElementById('detailNotes').textContent = u.notes || 'لا توجد ملاحظات.';

  const images = u.images || [];
  const mainImg = document.getElementById('detailMainImage');
  const thumbContainer = document.getElementById('detailThumbnails');
  
  if (images.length > 0) {
    mainImg.src = images[0];
    thumbContainer.innerHTML = images.map((img, i) => 
      `<img src="${img}" onclick="document.getElementById('detailMainImage').src='${img}'; document.querySelectorAll('.thumbnail-container img').forEach(el=>el.classList.remove('active')); this.classList.add('active');" class="${i===0?'active':''}">`
    ).join('');
  } else {
    mainImg.src = 'https://via.placeholder.com/600x400?text=No+Image';
    thumbContainer.innerHTML = '';
  }

  document.getElementById('unitDetailPage').classList.remove('hidden');
}

function closeUnitDetail() {
  document.getElementById('unitDetailPage').classList.add('hidden');
}

// استمارة إضافة العقار (معدلة وشيلنا منها العميل)
async function openUnitForm(id = null) {
  const units = await DataAPI.getUnits();
  const unit = id ? units.find(u => String(u.id) === String(id)) : {};
  const owners = await DataAPI.getOwners();
  
  const body = `
    <div style="background:#eff6ff;padding:15px;border-radius:10px;border:1px solid #bfdbfe; margin-bottom:10px;">
      <label style="margin-bottom:8px; color:#1e40af; font-weight:800;">هل المالك غير مسجل؟ سجله الآن فوراً:</label>
      <div class="row">
        <input type="text" id="f_newOwnerName" placeholder="اسم المالك الجديد">
        <input type="text" id="f_newOwnerPhone" placeholder="رقم الموبايل">
      </div>
    </div>

    <div class="row">
      <div>
        <label>أو اختر المالك من القائمة *</label>
        <select id="f_ownerId">
          <option value="">-- اختر المالك --</option>
          ${owners.map(o => `<option value="${o.id}" ${unit.ownerId === o.id ? 'selected' : ''}>${o.name}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="row">
      <div><label>المشروع *</label><input id="f_project" value="${unit.project || ''}" placeholder="مثال: برج الياسمين"></div>
      <div><label>المنطقة *</label><input id="f_area" value="${unit.area || ''}" placeholder="مثال: مدينة نصر"></div>
    </div>
    
    <div class="row">
      <div><label>العمارة / المبنى</label><input id="f_building" value="${unit.building || ''}" placeholder="مثال: عمارة 5"></div>
      <div><label>الدور</label><input id="f_floor" value="${unit.floor || ''}" placeholder="مثال: 3"></div>
    </div>
    
    <div class="row">
      <div><label>رقم الشقة</label><input id="f_unitNo" value="${unit.unitNo || ''}" placeholder="مثال: 12"></div>
      <div><label>المساحة (م²)</label><input type="number" id="f_size" value="${unit.size || ''}" placeholder="مثال: 120"></div>
    </div>
    
    <div class="row">
      <div><label>عدد الغرف</label><input type="number" id="f_rooms" value="${unit.rooms || ''}" placeholder="مثال: 3"></div>
      <div><label>عدد الحمامات</label><input type="number" id="f_baths" value="${unit.baths || ''}" placeholder="مثال: 2"></div>
    </div>
    
    <div class="row">
      <div><label>السعر</label><input type="number" id="f_price" value="${unit.price || ''}" placeholder="السعر بالجنيه"></div>
      <div><label>نوع العرض</label>
        <select id="f_dealType">
          <option ${unit.dealType === 'بيع' ? 'selected' : ''}>بيع</option>
          <option ${unit.dealType === 'إيجار' ? 'selected' : ''}>إيجار</option>
        </select>
      </div>
    </div>
    
    <div>
      <label>الحالة</label>
      <select id="f_status">
        ${['متاحة','محجوزة','مبيعة','مؤجرة'].map(s => `<option ${unit.status === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>

    <div style="background:#f8fafc; padding:15px; border-radius:10px; border:1px solid #e2e8f0;">
      <label>صور العقار (اختر أكتر من صورة من جهازك)</label>
      <input type="file" id="f_images_file" accept="image/*" multiple onchange="handleImagesUpload(event)" style="padding:8px; background:#fff; border:1px dashed #cbd5e1;">
      <input type="hidden" id="f_images_data" value='${JSON.stringify(unit.images || [])}'>
      <div id="imagesPreview" class="thumbnail-container" style="margin-top:10px; flex-wrap: wrap;">
        ${(unit.images || []).map(img => `<img src="${img}" style="width:60px;height:60px;">`).join('')}
      </div>
    </div>

    <div><label>ملاحظات</label><textarea id="f_notes" rows="2">${unit.notes || ''}</textarea></div>
  `;
  
  openModal(id ? 'تعديل بيانات العقار' : 'إضافة عقار جديد', body, async () => {
    let ownerId = document.getElementById('f_ownerId').value;
    
    const newOwnerName = document.getElementById('f_newOwnerName').value.trim();
    const newOwnerPhone = document.getElementById('f_newOwnerPhone').value.trim();
    if (newOwnerName && newOwnerPhone) {
      const newO = await DataAPI.addOwner({ name: newOwnerName, phone: newOwnerPhone, nationalId: '', address: '', notes: 'تم تسجيله تلقائياً' });
      ownerId = newO.id;
    }

    const data = {
      addedBy: currentUser.name,
      ownerId: ownerId,
      project: document.getElementById('f_project').value.trim(),
      area: document.getElementById('f_area').value.trim(),
      building: document.getElementById('f_building').value.trim(),
      floor: document.getElementById('f_floor').value.trim(),
      unitNo: document.getElementById('f_unitNo').value.trim(),
      size: Number(document.getElementById('f_size').value) || 0,
      rooms: Number(document.getElementById('f_rooms').value) || 0,
      baths: Number(document.getElementById('f_baths').value) || 0,
      price: Number(document.getElementById('f_price').value) || 0,
      dealType: document.getElementById('f_dealType').value,
      status: document.getElementById('f_status').value,
      images: JSON.parse(document.getElementById('f_images_data').value || '[]'),
      notes: document.getElementById('f_notes').value.trim()
    };
    
    if (!data.ownerId || !data.project || !data.area) { alert('يرجى ملء الحقول المطلوبة (المالك، المشروع، المنطقة)'); return; }
    if (id) await DataAPI.updateUnit(id, data); else await DataAPI.addUnit(data);
    closeModal(); await renderAll();
  });
}

function handleImagesUpload(event) {
  const files = event.target.files;
  if (files.length > 0) {
    let imagesArr = JSON.parse(document.getElementById('f_images_data').value || '[]');
    const previewContainer = document.getElementById('imagesPreview');
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = function(e) {
        imagesArr.push(e.target.result);
        document.getElementById('f_images_data').value = JSON.stringify(imagesArr);
        
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.width = '60px';
        img.style.height = '60px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '6px';
        img.style.border = '1px solid #cbd5e1';
        previewContainer.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  }
}

async function removeUnit(id) { if (!confirm('هل أنت متأكد من حذف هذا العقار؟')) return; await DataAPI.deleteUnit(id); await renderAll(); }

// ========== دوال المدير ==========

async function renderOwners() {
  const search = (document.getElementById('ownerSearch')?.value || '').toLowerCase();
  let owners = await DataAPI.getOwners();
  if (search) owners = owners.filter(o => o.name.toLowerCase().includes(search) || o.phone.includes(search));
  
  const rows = await Promise.all(owners.map(async o => {
    const count = await DataAPI.getOwnerUnitsCount(o.id);
    return `
      <tr>
        <td>#${o.id ? o.id.slice(-4) : ''}</td><td><strong>${o.name}</strong></td><td>${o.phone}</td><td>${o.address || '—'}</td><td>${count} عقار</td>
        <td>
          <button class="btn-edit" onclick="openOwnerForm('${o.id}')">تعديل</button>
          <button class="btn-danger" onclick="removeOwner('${o.id}')">حذف</button>
        </td>
      </tr>
    `;
  }));
  
  document.getElementById('ownersBody').innerHTML = rows.join('') || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px">لا يوجد ملاك مسجلين</td></tr>';
}

async function openOwnerForm(id = null) {
  let o = {};
  if (id) {
    const owners = await DataAPI.getOwners();
    o = owners.find(x => String(x.id) === String(id)) || {};
  }
  
  const body = `
    <div><label>الاسم *</label><input id="o_name" value="${o.name || ''}"></div>
    <div><label>الموبايل *</label><input id="o_phone" value="${o.phone || ''}"></div>
    <div><label>الرقم القومي / السجل</label><input id="o_nationalId" value="${o.nationalId || ''}"></div>
    <div><label>العنوان</label><input id="o_address" value="${o.address || ''}"></div>
    <div><label>ملاحظات</label><textarea id="o_notes" rows="2">${o.notes || ''}</textarea></div>
  `;
  
  openModal(id ? 'تعديل مالك' : 'إضافة مالك جديد', body, async () => {
    const data = { name: document.getElementById('o_name').value.trim(), phone: document.getElementById('o_phone').value.trim(), nationalId: document.getElementById('o_nationalId').value.trim(), address: document.getElementById('o_address').value.trim(), notes: document.getElementById('o_notes').value.trim() };
    if (!data.name || !data.phone) { alert('الاسم والموبايل مطلوبين'); return; }
    if (id) await DataAPI.updateOwner(id, data); else await DataAPI.addOwner(data);
    closeModal(); await renderAll();
  });
}

async function removeOwner(id) { 
  const count = await DataAPI.getOwnerUnitsCount(id);
  if (count > 0) { alert('لا يمكن حذف مالك مرتبط بعقارات'); return; } 
  if (!confirm('تأكيد الحذف؟')) return; 
  await DataAPI.deleteOwner(id); 
  await renderAll(); 
}

// ==========================================
// دالة عرض العملاء (القائمة المطوية الاحترافية)
// ==========================================
async function renderClients() {
  const search = (document.getElementById('clientSearch')?.value || '').toLowerCase();
  let clients = await DataAPI.getClients(null);
  
  if (search) clients = clients.filter(c => c.name.toLowerCase().includes(search) || c.phone.includes(search));
  
  const container = document.getElementById('clientsContainer');
  
  if (clients.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#94a3b8;padding:20px">لا يوجد عملاء مسجلين</div>';
    return;
  }

  const grouped = {};
  for (const c of clients) {
    const assignedName = await DataAPI.getUserName(c.assignedTo);
    const key = c.assignedTo || 'unassigned';
    if (!grouped[key]) grouped[key] = { name: assignedName, clients: [] };
    grouped[key].clients.push(c);
  }

  let html = '';
  for (const key in grouped) {
    const group = grouped[key];
    const count = group.clients.length;
    const isFirst = (html === '');
    
    let counter = 1;
    let rowsHtml = group.clients.map(c => {
      const row = `
        <tr>
          <td>#${counter}</td>
          <td><strong>${c.name}</strong></td>
          <td>${c.phone}</td>
          <td><span class="badge متاحة">${c.type}</span></td>
          <td>
            <button class="btn-view" onclick="viewClientDetails('${c.id}')">📞 المتابعة</button>
            <button class="btn-edit" onclick="openClientForm('${c.id}')">تعديل</button>
            <button class="btn-danger" onclick="removeClient('${c.id}')">حذف</button>
          </td>
        </tr>
      `;
      counter++;
      return row;
    }).join('');

    html += `
      <div class="accordion-item">
        <div class="accordion-header ${isFirst ? 'active' : ''}" onclick="toggleAccordion(this)">
          <div class="sales-info">
            <span class="badge" style="background:#e0e7ff;color:#4f46e5;border:1px solid #c7d2fe;">👤 ${group.name}</span>
            <span style="color:#64748b; font-size:13px; font-weight:600;">(لديه ${count} عميل)</span>
          </div>
          <span class="arrow">▼</span>
        </div>
        <div class="accordion-body ${isFirst ? 'active' : ''}">
          <table class="table">
            <thead>
              <tr><th>الكود</th><th>الاسم</th><th>الموبايل</th><th>النوع</th><th>إجراءات</th></tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html;
}

function toggleAccordion(header) {
  const body = header.nextElementSibling;
  header.classList.toggle('active');
  body.classList.toggle('active');
}

async function openClientForm(id = null) {
  let c = {};
  if (id) {
    const clients = await DataAPI.getClients(currentUser);
    c = clients.find(x => String(x.id) === String(id)) || {};
  }
  
  let assignHtml = '';
  if (currentUser.role === 'admin') {
    const salesUsers = await DataAPI.getSalesUsers();
    assignHtml = `
      <div>
        <label>مسؤول المتابعة (السيلز) *</label>
        <select id="c_assignedTo">
          <option value="">-- غير محدد --</option>
          ${salesUsers.map(u => `<option value="${u.username}" ${c.assignedTo === u.username ? 'selected' : ''}>${u.name}</option>`).join('')}
        </select>
      </div>
    `;
  }

  const body = `
    <div><label>الاسم *</label><input id="c_name" value="${c.name || ''}"></div>
    <div><label>الموبايل *</label><input id="c_phone" value="${c.phone || ''}"></div>
    <div><label>النوع</label><select id="c_type"><option ${c.type === 'مشتري' ? 'selected' : ''}>مشتري</option><option ${c.type === 'مستأجر' ? 'selected' : ''}>مستأجر</option></select></div>
    
    ${assignHtml}

    <div><label>ملاحظات</label><textarea id="c_notes" rows="2">${c.notes || ''}</textarea></div>
  `;
  
  openModal(id ? 'تعديل عميل' : 'إضافة عميل جديد', body, async () => {
    let assignedTo = '';
    if (currentUser.role === 'admin') {
      assignedTo = document.getElementById('c_assignedTo').value;
      if (!assignedTo) { alert('لازم تختار مسؤول المتابعة'); return; }
    } else {
      assignedTo = currentUser.username;
    }

    const data = { 
      name: document.getElementById('c_name').value.trim(), 
      phone: document.getElementById('c_phone').value.trim(), 
      type: document.getElementById('c_type').value, 
      assignedTo: assignedTo,
      notes: document.getElementById('c_notes').value.trim(),
      feedbacks: c.feedbacks || []
    };
    
    if (!data.name || !data.phone) { alert('الاسم والموبايل مطلوبين'); return; }
    
    if (id) await DataAPI.updateClient(id, data); else await DataAPI.addClient(data);
    closeModal();
    
    if (currentUser.role === 'admin') {
      await renderAll();
    } else {
      await renderMyClients();
    }
  });
}

async function removeClient(id) { 
  if (!confirm('هل أنت متأكد من حذف هذا العميل نهائياً؟')) return; 
  try {
    await DataAPI.deleteClient(id); 
    alert('تم حذف العميل بنجاح');
    await renderAll(); 
  } catch (error) {
    alert('حدث خطأ أثناء الحذف: ' + error.message);
  }
}

async function renderTeam() {
  const search = (document.getElementById('teamSearch')?.value || '').toLowerCase();
  let users = await DataAPI.getUsers();
  users = users.filter(u => u.role === 'sales');
  
  if (search) users = users.filter(u => u.name.toLowerCase().includes(search) || u.username.toLowerCase().includes(search));
  
  document.getElementById('teamBody').innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td>${u.name}</td>
      <td><code>${u.password}</code></td>
      <td><span class="badge مبيعة">سيلز</span></td>
      <td>
        <button class="btn-edit" onclick="openTeamForm('${u.username}')">تعديل</button>
        <button class="btn-danger" onclick="removeTeamUser('${u.username}')">حذف</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">لا يوجد سيلز مسجلين</td></tr>';
}

async function openTeamForm(username = null) {
  let u = {};
  if (username) {
    const users = await DataAPI.getUsers();
    u = users.find(x => x.username === username) || {};
  }
  
  const body = `
    <div><label>اسم المستخدم (للدخول) *</label><input id="t_username" value="${u.username || ''}" placeholder="مثال: ali" ${username ? 'disabled' : ''}></div>
    <div><label>الاسم الكامل *</label><input id="t_name" value="${u.name || ''}" placeholder="مثال: علي حسن"></div>
    <div><label>كلمة المرور *</label><input id="t_password" value="${u.password || ''}" placeholder="••••••"></div>
    <div><label>الصلاحية</label><input value="سيلز (Sales)" disabled style="background:#f1f5f9; cursor:not-allowed;"></div>
  `;
  
  openModal(username ? 'تعديل بيانات السيلز' : 'إضافة سيلز جديد', body, async () => {
    const newUsername = document.getElementById('t_username').value.trim();
    const data = {
      username: username || newUsername,
      name: document.getElementById('t_name').value.trim(),
      password: document.getElementById('t_password').value.trim(),
      role: 'sales'
    };
    
    if (!data.username || !data.name || !data.password) { alert('جميع الحقول مطلوبة'); return; }
    
    if (!username) {
      const users = await DataAPI.getUsers();
      const exists = users.find(x => x.username === data.username);
      if (exists) { alert('اسم المستخدم ده موجود بالفعل!'); return; }
      await DataAPI.addUser(data);
    } else {
      await DataAPI.updateUser(username, data);
    }
    
    closeModal(); await renderTeam();
  });
}

async function removeTeamUser(username) {
  if (!confirm('هل أنت متأكد من حذف هذا السيلز؟ (هيتشال من النظام ومش هيقدر يدخل تاني)')) return;
  await DataAPI.deleteUser(username);
  await renderTeam();
}

// ========== دوال السيلز ==========

async function renderMyClients() {
  const search = (document.getElementById('myClientSearch')?.value || '').toLowerCase();
  let myClients = await DataAPI.getClients(currentUser);
  
  if (search) myClients = myClients.filter(c => c.name.toLowerCase().includes(search) || c.phone.includes(search));
  
  document.getElementById('myClientsBody').innerHTML = myClients.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.phone}</td>
      <td><span class="badge متاحة">${c.type || 'غير محدد'}</span></td>
      <td><small style="color:#64748b">${c.notes || 'لا يوجد'}</small></td>
      <td>
        <button class="btn-view" onclick="viewClientDetails('${c.id}')">📞 تسجيل المتابعة</button>
        <button class="btn-edit" onclick="openClientForm('${c.id}')">تعديل</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">لا يوجد أرقام مخصصة لك حالياً. (اضغط على إضافة رقم جديد)</td></tr>';
}

async function viewClientDetails(id) {
  const clients = await DataAPI.getClients();
  const c = clients.find(x => String(x.id) === String(id));
  if (!c) return;
  
  const feedbacks = c.feedbacks || [];
  const sortedFeedbacks = [...feedbacks].reverse(); 
  
  const fbHTML = sortedFeedbacks.map((f, index) => `
    <li style="background:#f8fafc; padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid #e2e8f0; position:relative;">
      <div style="font-weight:700; color:#0f172a;">${f.text}</div>
      <small style="color:#64748b;">بواسطة: ${f.by} - ${f.date}</small>
      ${index === 0 && feedbacks.length > 1 ? `<span style="position:absolute; top:10px; left:10px; background:#fef2f2; color:#ef4444; font-size:11px; padding:2px 8px; border-radius:5px; border:1px solid #fca5a5;">متابعة إضافية</span>` : ''}
    </li>
  `).join('') || '<li style="color:#94a3b8; text-align:center; padding:10px;">لا يوجد متابعات مسجلة بعد.</li>';

  const assignedName = await DataAPI.getUserName(c.assignedTo);

  const body = `
    <div style="background:#eff6ff; padding:15px; border-radius:10px; margin-bottom:15px;">
      <h3 style="color:#1e40af; margin-bottom:5px;">${c.name}</h3>
      <p style="color:#3b82f6; font-weight:700;">📱 ${c.phone}</p>
      <p style="color:#64748b; font-size:13px; margin-top:5px;">مسؤول المتابعة: ${assignedName}</p>
    </div>

    <h4 style="margin-bottom:10px; color:#0f172a;">📝 سجل المتابعات:</h4>
    <ul style="list-style:none; padding:0; max-height:200px; overflow-y:auto; margin-bottom:15px;">
      ${fbHTML}
    </ul>

    <div style="background:#f0fdf4; padding:15px; border-radius:10px; border:1px solid #bbf7d0;">
      <label style="color:#166534; font-weight:800; margin-bottom:8px; display:block;">إضافة متابعة جديدة:</label>
      <textarea id="newFeedbackText" rows="2" placeholder="مثال: العميل رد وقال هياخد وقت يفكر..." style="width:100%; padding:10px; border-radius:8px; border:1px solid #cbd5e1; margin-bottom:10px; font-family:inherit;"></textarea>
      <button class="btn-primary" style="width:100%;" onclick="saveClientFeedback('${c.id}')">حفظ المتابعة</button>
    </div>
  `;

  document.getElementById('modalTitle').textContent = 'متابعة العميل';
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalSave').style.display = 'none';
  document.getElementById('modal').classList.remove('hidden');
}

async function saveClientFeedback(clientId) {
  const text = document.getElementById('newFeedbackText').value.trim();
  if (!text) { alert('اكتب تفاصيل المتابعة الأول'); return; }
  
  await DataAPI.addClientFeedback(clientId, text, currentUser.name);
  closeModal();
  
  if (currentUser.role === 'admin') {
    await renderClients();
  } else {
    await renderMyClients();
  }
  alert('تم حفظ المتابعة بنجاح!');
}