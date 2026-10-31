/**
 * Main Application Controller - BMU Student Management Portal
 * Integrates UI with StudentDB and TestCaseRunner
 */

document.addEventListener('DOMContentLoaded', () => {
  // Global App State
  const state = {
    currentTab: 'search-view',
    searchQuery: '',
    selectedStudentForCard: null,
    editingStudent: null,
    concurrencyTargetAdm: '24MBA015',
    windowA: { student: null, version: null },
    windowB: { student: null, version: null }
  };

  // DOM Elements
  const elements = {
    navTabs: document.querySelectorAll('.nav-tab-btn'),
    tabPanes: document.querySelectorAll('.tab-pane'),
    totalStudentsCount: document.getElementById('statTotalStudents'),
    activeVersionsCount: document.getElementById('statActiveVersions'),
    conflictStatsCount: document.getElementById('statConflictProtection'),
    
    // Search View
    searchInput: document.getElementById('searchInput'),
    btnSearch: document.getElementById('btnSearch'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    filterPills: document.querySelectorAll('.pill-badge'),
    studentsGrid: document.getElementById('studentsGrid'),
    notFoundState: document.getElementById('studentNotFoundState'),
    notFoundQueryText: document.getElementById('notFoundQueryText'),
    btnResetDb: document.getElementById('btnResetDb'),

    // Modals
    viewModalBackdrop: document.getElementById('viewModalBackdrop'),
    viewModalContent: document.getElementById('viewModalBody'),
    editModalBackdrop: document.getElementById('editModalBackdrop'),
    editForm: document.getElementById('editStudentForm'),

    // Register Form
    registerForm: document.getElementById('registerStudentForm'),
    btnTc1FillDuplicate: document.getElementById('btnTc1FillDuplicate'),
    btnDemoSibling: document.getElementById('btnDemoSibling'),
    btnDemoDuplicatePhone: document.getElementById('btnDemoDuplicatePhone'),
    btnTc1RaceSimulate: document.getElementById('btnTc1RaceSimulate'),

    // ID Card Studio
    idCardSearchInput: document.getElementById('idCardSearchInput'),
    btnLoadIdCard: document.getElementById('btnLoadIdCard'),
    idCardStudentPicker: document.getElementById('idCardStudentPicker'),
    idCardPreviewContainer: document.getElementById('idCardPreviewContainer'),
    idCardEmptyAlert: document.getElementById('idCardEmptyAlert'),
    btnPrintCard: document.getElementById('btnPrintCard'),
    btnRegenerateCard: document.getElementById('btnRegenerateCard'),

    // Concurrency Sandbox
    sandboxStudentSelect: document.getElementById('sandboxStudentSelect'),
    winAAdmission: document.getElementById('winAAdmission'),
    winAName: document.getElementById('winAName'),
    winAVersion: document.getElementById('winAVersion'),
    winAPhone: document.getElementById('winAPhone'),
    winAAddress: document.getElementById('winAAddress'),
    btnSaveWinA: document.getElementById('btnSaveWinA'),
    winAAlert: document.getElementById('winAAlert'),

    winBAdmission: document.getElementById('winBAdmission'),
    winBName: document.getElementById('winBName'),
    winBVersion: document.getElementById('winBVersion'),
    winBPhone: document.getElementById('winBPhone'),
    winBAddress: document.getElementById('winBAddress'),
    btnSaveWinB: document.getElementById('btnSaveWinB'),
    btnRefreshWinB: document.getElementById('btnRefreshWinB'),
    winBAlert: document.getElementById('winBAlert'),

    // Test Suite Tab
    btnRunAllTests: document.getElementById('btnRunAllTests'),
    btnRunTC1: document.getElementById('btnRunTC1'),
    btnRunTC2: document.getElementById('btnRunTC2'),
    btnRunTC3: document.getElementById('btnRunTC3'),
    btnRunTC4: document.getElementById('btnRunTC4'),
    btnClearConsole: document.getElementById('btnClearConsole'),
    consoleOutput: document.getElementById('consoleOutput'),
    badgeTc1: document.getElementById('badgeTc1'),
    badgeTc2: document.getElementById('badgeTc2'),
    badgeTc3: document.getElementById('badgeTc3'),
    badgeTc4: document.getElementById('badgeTc4'),

    toastContainer: document.getElementById('toastContainer')
  };

  // ==========================================
  // Toast Notification System
  // ==========================================
  function showToast(title, message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${message}</div>
      </div>
    `;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // ==========================================
  // Navigation Tabs Controller
  // ==========================================
  elements.navTabs.forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      const targetTab = tabBtn.dataset.tab;
      switchTab(targetTab);
    });
  });

  function switchTab(tabId) {
    state.currentTab = tabId;
    elements.navTabs.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    elements.tabPanes.forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });

    if (tabId === 'concurrency-sandbox') {
      loadSandboxData();
    } else if (tabId === 'id-card') {
      populateIdCardPicker();
    } else if (tabId === 'search-view') {
      renderStudentList();
    }
  }

  // Expose switchTab globally for shortcuts
  window.switchPortalTab = switchTab;

  // ==========================================
  // Render Student Directory & Search (Req A & B)
  // Shows BOTH: Personal Email + Allocated BMU Institutional Email
  // ==========================================
  function renderStudentList() {
    const students = window.StudentDB.search(state.searchQuery);
    updateStatsBar();

    if (students.length === 0) {
      elements.studentsGrid.innerHTML = '';
      elements.notFoundState.style.display = 'block';
      elements.notFoundQueryText.textContent = state.searchQuery ? `for query "${state.searchQuery}"` : '';
      return;
    }

    elements.notFoundState.style.display = 'none';
    elements.studentsGrid.innerHTML = students.map(student => `
      <div class="student-card" data-adm="${student.admissionNo}">
        <div class="student-card-header">
          <img src="${student.avatar}" alt="${student.name}" class="student-avatar" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(student.name)}'" />
          <div class="student-card-title">
            <h3 class="student-name">${student.name}</h3>
            <div>
              <span class="admission-badge">🎓 ${student.admissionNo}</span>
              <span class="version-pill" title="Optimistic Concurrency Control Version">v${student._version}</span>
            </div>
          </div>
        </div>
        
        <div class="student-card-body">
          <div class="detail-row">
            <span class="detail-label">📚 Course:</span>
            <span class="detail-value">${student.course} (${student.section})</span>
          </div>

          <!-- BOTH Personal Email & Allocated BMU Institutional Email -->
          <div class="detail-row" style="background: #f0f7ff; padding: 4px 6px; border-radius: 6px;">
            <span class="detail-label" style="color: #0078d4;">🏛️ BMU Mail:</span>
            <span class="detail-value" style="color: #0078d4; font-weight: 700;">${student.allocatedEmail}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">✉️ Personal:</span>
            <span class="detail-value" style="color: #475569;">${student.personalEmail || student.email}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">📞 Student:</span>
            <span class="detail-value" style="font-weight: 700;">${student.phone}</span>
          </div>

          <!-- Parent / Sibling Details -->
          <div class="detail-row">
            <span class="detail-label">👨‍👩‍👧 Parent:</span>
            <span class="detail-value" style="color: #475569;">${student.parentName || 'N/A'} ${student.parentPhone ? `(${student.parentPhone})` : ''}</span>
          </div>

          <div class="detail-row">
            <span class="detail-label">📍 Address:</span>
            <span class="detail-value" style="font-size: 0.8rem;">${student.address}</span>
          </div>
        </div>

        <div class="student-card-footer">
          <button class="btn-card-action" onclick="window.viewStudentModal('${student.admissionNo}')">
            👁️ Details
          </button>
          <button class="btn-card-action" onclick="window.openEditModal('${student.admissionNo}')">
            ✏️ Edit
          </button>
          <button class="btn-card-action primary" onclick="window.generateCardForStudent('${student.admissionNo}')">
            🪪 ID Card
          </button>
        </div>
      </div>
    `).join('');
  }

  function updateStatsBar() {
    const all = window.StudentDB.getAllStudents();
    if (elements.totalStudentsCount) elements.totalStudentsCount.textContent = all.length;
    const maxVer = all.reduce((max, s) => Math.max(max, s._version || 1), 1);
    if (elements.activeVersionsCount) elements.activeVersionsCount.textContent = `v${maxVer}`;
  }

  // Search input listeners
  elements.btnSearch.addEventListener('click', () => {
    state.searchQuery = elements.searchInput.value.trim();
    renderStudentList();
  });

  elements.searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      state.searchQuery = elements.searchInput.value.trim();
      renderStudentList();
    }
  });

  elements.btnClearSearch.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.filterPills.forEach(p => p.classList.remove('active'));
    renderStudentList();
  });

  // Filter pills
  elements.filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      elements.filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const val = pill.dataset.filter;
      elements.searchInput.value = val;
      state.searchQuery = val;
      renderStudentList();
    });
  });

  // Reset database button
  if (elements.btnResetDb) {
    elements.btnResetDb.addEventListener('click', () => {
      if (confirm('Reset student records to official BMU seed data?')) {
        window.StudentDB.resetToSampleData();
        showToast('Database Reset', 'Sample records reloaded successfully.', 'success');
        renderStudentList();
      }
    });
  }

  // ==========================================
  // View Student Details Modal (Req B)
  // Shows Personal Email, Allocated BMU Email, Parent Details
  // ==========================================
  window.viewStudentModal = function(admissionNo) {
    const student = window.StudentDB.getByAdmissionNo(admissionNo);
    if (!student) {
      showToast('Error', `Student with ID ${admissionNo} not found.`, 'error');
      return;
    }

    elements.viewModalContent.innerHTML = `
      <div style="display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1.5rem; background: #f8fafc; padding: 1.25rem; border-radius: 12px; border: 1px solid #e2e8f0;">
        <img src="${student.avatar}" alt="${student.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #0078d4;">
        <div>
          <h2 style="font-size: 1.4rem; color: #0c2340; margin-bottom: 0.25rem;">${student.name}</h2>
          <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
            <span class="admission-badge">🎓 ${student.admissionNo}</span>
            <span class="version-pill">Record Version: v${student._version}</span>
            <span style="font-size: 0.75rem; background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 999px; font-weight: 600;">Blood: ${student.bloodGroup}</span>
          </div>
        </div>
      </div>

      <table class="id-details-table" style="font-size: 0.92rem;">
        <tr><td class="label-col">Admission No:</td><td class="value-col"><b>${student.admissionNo}</b> (Consistent 8-char)</td></tr>
        <tr><td class="label-col">Full Name:</td><td class="value-col">${student.name}</td></tr>
        <tr><td class="label-col">Date of Birth:</td><td class="value-col">${student.dob}</td></tr>
        <tr style="background: #f0f7ff;"><td class="label-col" style="color: #0078d4;">Allocated BMU Email:</td><td class="value-col" style="color: #0078d4;"><b>${student.allocatedEmail}</b> (Official)</td></tr>
        <tr><td class="label-col">Personal Email:</td><td class="value-col">${student.personalEmail || student.email}</td></tr>
        <tr><td class="label-col">Student Phone:</td><td class="value-col"><b>${student.phone}</b> (Unique)</td></tr>
        <tr style="background: #f8fafc;"><td class="label-col">Parent / Guardian:</td><td class="value-col">${student.parentName || 'N/A'} (Phone: ${student.parentPhone || 'N/A'}, Email: ${student.parentEmail || 'N/A'})</td></tr>
        <tr><td class="label-col">Course / Program:</td><td class="value-col">${student.course}</td></tr>
        <tr><td class="label-col">Class & Section:</td><td class="value-col">${student.section}</td></tr>
        <tr><td class="label-col">Residential Address:</td><td class="value-col">${student.address}</td></tr>
        <tr><td class="label-col">Last Modified:</td><td class="value-col">${new Date(student.updatedAt).toLocaleString()}</td></tr>
      </table>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
        <button class="btn-secondary" onclick="window.closeViewModal()">Close</button>
        <button class="btn-primary" onclick="window.closeViewModal(); window.generateCardForStudent('${student.admissionNo}')">🪪 View ID Card</button>
        <button class="btn-primary" onclick="window.closeViewModal(); window.openEditModal('${student.admissionNo}')">✏️ Edit Details</button>
      </div>
    `;

    elements.viewModalBackdrop.classList.add('open');
  };

  window.closeViewModal = function() {
    elements.viewModalBackdrop.classList.remove('open');
  };

  // Close modals on backdrop click
  elements.viewModalBackdrop.addEventListener('click', (e) => {
    if (e.target === elements.viewModalBackdrop) window.closeViewModal();
  });
  elements.editModalBackdrop.addEventListener('click', (e) => {
    if (e.target === elements.editModalBackdrop) window.closeEditModal();
  });

  // ==========================================
  // Update Student Details & TC2 Testing (Req C & TC2)
  // ==========================================
  window.openEditModal = function(admissionNo) {
    const student = window.StudentDB.getByAdmissionNo(admissionNo);
    if (!student) {
      showToast('Error', 'Student record not found.', 'error');
      return;
    }

    state.editingStudent = { ...student };

    // Fill form
    document.getElementById('editAdmissionNo').value = student.admissionNo;
    document.getElementById('editVersionTag').textContent = `v${student._version}`;
    document.getElementById('editExpectedVersion').value = student._version;
    document.getElementById('editName').value = student.name;
    document.getElementById('editDob').value = student.dob;
    document.getElementById('editPersonalEmail').value = student.personalEmail || student.email;
    document.getElementById('editAllocatedEmail').value = student.allocatedEmail;
    document.getElementById('editPhone').value = student.phone;
    document.getElementById('editCourse').value = student.course;
    document.getElementById('editSection').value = student.section;
    document.getElementById('editParentName').value = student.parentName || '';
    document.getElementById('editParentPhone').value = student.parentPhone || '';
    document.getElementById('editAddress').value = student.address;

    // Reset error banners
    const alertBox = document.getElementById('editModalAlert');
    alertBox.style.display = 'none';

    elements.editModalBackdrop.classList.add('open');
  };

  window.closeEditModal = function() {
    elements.editModalBackdrop.classList.remove('open');
    state.editingStudent = null;
  };

  // Button to pre-populate invalid phone number to test TC2
  const btnTriggerTc2Invalid = document.getElementById('btnTriggerTc2Invalid');
  if (btnTriggerTc2Invalid) {
    btnTriggerTc2Invalid.addEventListener('click', () => {
      document.getElementById('editPhone').value = '9812-INVALID-NUM';
      document.getElementById('editAddress').value = 'Valid New Updated Address: Sector 45 Gurugram';
      showToast('TC2 Demo Data Loaded', 'Invalid phone and modified address loaded. Click "Save Changes" to verify atomic rollback rejection.', 'warning');
    });
  }

  // Handle Edit Form Submission (Enforces TC2 & Optimistic Concurrency TC3)
  elements.editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const admNo = document.getElementById('editAdmissionNo').value;
    const expectedVer = parseInt(document.getElementById('editExpectedVersion').value, 10);

    const updatedData = {
      name: document.getElementById('editName').value,
      dob: document.getElementById('editDob').value,
      personalEmail: document.getElementById('editPersonalEmail').value,
      phone: document.getElementById('editPhone').value,
      course: document.getElementById('editCourse').value,
      section: document.getElementById('editSection').value,
      parentName: document.getElementById('editParentName').value,
      parentPhone: document.getElementById('editParentPhone').value,
      address: document.getElementById('editAddress').value
    };

    const alertBox = document.getElementById('editModalAlert');

    const result = window.StudentDB.updateStudent(admNo, updatedData, expectedVer);

    if (result.success) {
      alertBox.className = 'alert-banner success';
      alertBox.innerHTML = `<strong>✅ Success:</strong> ${result.message}`;
      alertBox.style.display = 'flex';
      showToast('Record Updated', result.message, 'success');
      setTimeout(() => {
        window.closeEditModal();
        renderStudentList();
      }, 900);
    } else {
      // Rejection handling (TC2, TC3, or uniqueness conflict)
      alertBox.className = 'alert-banner error';
      if (result.errorType === 'VALIDATION_FAILED') {
        const errorList = Object.entries(result.errors).map(([field, msg]) => `<li><b>${field}:</b> ${msg}</li>`).join('');
        alertBox.innerHTML = `
          <div>
            <strong>🛡️ TC2 ATOMIC INTEGRITY ENFORCED:</strong><br>
            ${result.message}
            <ul style="margin-top: 0.5rem; padding-left: 1.25rem;">${errorList}</ul>
            <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #4b5563;">
              * No changes were written to the database. The original record remains unchanged.
            </div>
          </div>
        `;
      } else if (result.errorType === 'CONCURRENCY_CONFLICT') {
        alertBox.innerHTML = `
          <div>
            <strong>⚡ TC3 CONCURRENCY CONFLICT:</strong><br>
            ${result.message}
          </div>
        `;
      } else {
        alertBox.innerHTML = `<strong>Error:</strong> ${result.message}`;
      }
      alertBox.style.display = 'flex';
      showToast('Update Rejected', result.message, 'error');
    }
  });

  // ==========================================
  // Register New Student & TC1 Testing (Req E & TC1)
  // Automatically generates BMU email and gives instant ID generation
  // ==========================================
  elements.registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const alertBox = document.getElementById('registerAlert');

    const newStudent = {
      name: document.getElementById('regName').value,
      dob: document.getElementById('regDob').value,
      personalEmail: document.getElementById('regPersonalEmail').value,
      phone: document.getElementById('regPhone').value,
      course: document.getElementById('regCourse').value,
      bloodGroup: document.getElementById('regBloodGroup').value,
      parentName: document.getElementById('regParentName').value,
      parentPhone: document.getElementById('regParentPhone').value,
      parentEmail: document.getElementById('regParentEmail').value,
      address: document.getElementById('regAddress').value
    };

    const result = window.StudentDB.registerStudent(newStudent);

    if (result.success) {
      alertBox.className = 'alert-banner success';
      alertBox.innerHTML = `
        <div>
          <strong>✅ Registration Successful!</strong><br>
          Student: <b>${result.student.name}</b><br>
          Allotted Admission No: <span class="admission-badge" style="font-size: 0.82rem;">🎓 ${result.student.admissionNo}</span> &bull; 
          Allotted Section: <span style="font-weight: 700; color: #0078d4;">🏛️ ${result.student.section}</span> (Auto-assigned by name rule)<br>
          Allocated Official BMU Email: <b style="color: #0078d4;">${result.student.allocatedEmail}</b><br>
          Personal Email: <b>${result.student.personalEmail}</b> | Student Phone: <b>${result.student.phone}</b><br>
          Parent: <b>${result.student.parentName || 'N/A'}</b> (${result.student.parentPhone || 'N/A'})
          <div style="margin-top: 0.85rem;">
            <button type="button" class="btn-primary" onclick="window.generateCardForStudent('${result.student.admissionNo}')">
              🪪 Generate Official ID Card for ${result.student.name}
            </button>
          </div>
        </div>
      `;
      alertBox.style.display = 'flex';
      showToast('Registration Successful', `Admission No: ${result.student.admissionNo} | Section: ${result.student.section}`, 'success');
      elements.registerForm.reset();
      renderStudentList();
    } else {
      // Duplicate, Unique Phone conflict, or Validation Failure
      alertBox.className = 'alert-banner error';
      if (result.errorType === 'DUPLICATE_ADMISSION_NO') {
        alertBox.innerHTML = `
          <div>
            <strong>🚫 TC1 DUPLICATE REGISTRATION REJECTED:</strong><br>
            ${result.message}
          </div>
        `;
      } else if (result.errorType === 'VALIDATION_FAILED') {
        const errorList = Object.entries(result.errors).map(([f, m]) => `<li><b>${f}:</b> ${m}</li>`).join('');
        alertBox.innerHTML = `
          <div>
            <strong>Validation Error:</strong> ${result.message}
            <ul style="margin-top: 0.5rem; padding-left: 1.25rem;">${errorList}</ul>
          </div>
        `;
      }
      alertBox.style.display = 'flex';
      showToast('Registration Failed', result.message, 'error');
    }
  });

  // TC1 Helper button: Test Backend Rejection of Duplicate Admission No (24CSE001)
  if (elements.btnTc1FillDuplicate) {
    elements.btnTc1FillDuplicate.addEventListener('click', () => {
      const alertBox = document.getElementById('registerAlert');
      alertBox.className = 'alert-banner info';
      alertBox.innerHTML = `<strong>⚡ Testing TC1 Backend Duplicate Rejection for '24CSE001'...</strong>`;
      alertBox.style.display = 'flex';

      const duplicatePayload = {
        admissionNo: '24CSE001', // Already belongs to Aarav Sharma!
        name: 'Vikram Malhotra',
        dob: '2004-05-10',
        personalEmail: 'vikram.malhotra2004@gmail.com',
        phone: '9988776655',
        course: 'B.Tech - Computer Science & Engineering',
        address: 'Sector 14, Gurugram, Haryana - 122001'
      };

      const result = window.StudentDB.registerStudent(duplicatePayload);
      if (!result.success && result.errorType === 'DUPLICATE_ADMISSION_NO') {
        alertBox.className = 'alert-banner error';
        alertBox.innerHTML = `
          <div>
            <strong>🚫 TC1 DUPLICATE REGISTRATION REJECTED:</strong><br>
            ${result.message}
          </div>
        `;
        showToast('TC1 Rejection Verified', result.message, 'error');
      } else {
        alertBox.innerHTML = `Failed: ${JSON.stringify(result)}`;
      }
    });
  }

  // Demo Sibling: Sibling for Sneha Panjwani (24CSE042)
  // Demonstrates: Sibling shares exact same parent details, but has unique student phone and personal email
  if (elements.btnDemoSibling) {
    elements.btnDemoSibling.addEventListener('click', () => {
      document.getElementById('regName').value = 'Kunal Panjwani';
      document.getElementById('regDob').value = '2005-11-14';
      document.getElementById('regPersonalEmail').value = 'kunal.panjwani2005@gmail.com'; // Unique personal email
      document.getElementById('regPhone').value = '9899112233'; // Unique student phone
      document.getElementById('regCourse').value = 'B.Tech - Computer Science & Engineering';
      document.getElementById('regBloodGroup').value = 'O+';
      // Same parent details as Sneha Panjwani!
      document.getElementById('regParentName').value = 'Rajesh Panjwani';
      document.getElementById('regParentPhone').value = '9822233344';
      document.getElementById('regParentEmail').value = 'rajesh.panjwani@yahoo.com';
      document.getElementById('regAddress').value = 'House 12, Sushant Lok Phase 1, Gurugram, Haryana - 122009';

      showToast('Sibling Demo Loaded', 'Sibling details loaded for Kunal Panjwani (name starts with K -> will auto-allot to CSE-B). Click Register to verify!', 'info');
    });
  }

  // Demo Duplicate Student Phone Rejection
  if (elements.btnDemoDuplicatePhone) {
    elements.btnDemoDuplicatePhone.addEventListener('click', () => {
      document.getElementById('regName').value = 'Aditi Rao';
      document.getElementById('regDob').value = '2004-08-19';
      document.getElementById('regPersonalEmail').value = 'aditi.rao2004@gmail.com';
      document.getElementById('regPhone').value = '9812345678'; // Already registered to Sneha Panjwani!
      document.getElementById('regCourse').value = 'B.Tech - Computer Science & Engineering';
      document.getElementById('regBloodGroup').value = 'A+';
      document.getElementById('regParentName').value = 'Mahesh Rao';
      document.getElementById('regParentPhone').value = '9855566677';
      document.getElementById('regAddress').value = 'South City 1, Gurugram, Haryana';

      showToast('Duplicate Phone Demo Loaded', 'Form loaded with phone 9812345678 (already registered to Sneha). Click Register to verify phone uniqueness rejection!', 'warning');
    });
  }

  // TC1 Simultaneous race condition simulation
  if (elements.btnTc1RaceSimulate) {
    elements.btnTc1RaceSimulate.addEventListener('click', async () => {
      const alertBox = document.getElementById('registerAlert');
      alertBox.className = 'alert-banner info';
      alertBox.innerHTML = `<strong>⚡ Dispatching 2 Simultaneous Registration Requests for same ID '24RAC999'...</strong>`;
      alertBox.style.display = 'flex';

      const payload = {
        admissionNo: '24RAC999',
        name: 'Concurrent Candidate',
        dob: '2004-01-01',
        personalEmail: 'race.candidate@gmail.com',
        phone: '9876549999',
        course: 'B.Tech - Computer Science & Engineering',
        section: 'CSE-A',
        address: 'BML Munjal Campus, NH 8 Sidhrawali'
      };

      // Fire 2 simultaneous attempts
      const [res1, res2] = await Promise.all([
        Promise.resolve(window.StudentDB.registerStudent(payload)),
        Promise.resolve(window.StudentDB.registerStudent(payload))
      ]);

      const passed = (res1.success && !res2.success) || (!res1.success && res2.success);
      if (passed) {
        alertBox.className = 'alert-banner success';
        alertBox.innerHTML = `
          <strong>✅ TC1 SIMULTANEOUS RACE CONDITION HANDLED:</strong><br>
          - Request 1: ${res1.success ? 'ACCEPTED (First in)' : 'REJECTED (Duplicate)'}<br>
          - Request 2: ${res2.success ? 'ACCEPTED (First in)' : 'REJECTED (Duplicate)'}<br>
          Uniqueness strictly preserved: Only 1 record exists in database.
        `;
        showToast('TC1 Race Handled', 'Exactly one registration succeeded; duplicate request was rejected.', 'success');
      } else {
        alertBox.className = 'alert-banner error';
        alertBox.innerHTML = `Race condition failed: ${JSON.stringify({ res1, res2 })}`;
      }
      renderStudentList();
    });
  }

  // ==========================================
  // Student ID Card Studio (Req D & TC4)
  // Only ALLOCATED BMU email is visible on the ID Card!
  // ==========================================
  function populateIdCardPicker() {
    const students = window.StudentDB.getAllStudents();
    elements.idCardStudentPicker.innerHTML = `
      <option value="">-- Choose from Registered Students --</option>
      ${students.map(s => `<option value="${s.admissionNo}">${s.admissionNo} - ${s.name} (${s.allocatedEmail})</option>`).join('')}
    `;
    if (state.selectedStudentForCard) {
      elements.idCardStudentPicker.value = state.selectedStudentForCard.admissionNo;
    }
  }

  window.generateCardForStudent = function(admissionNo) {
    switchTab('id-card');
    elements.idCardSearchInput.value = admissionNo;
    loadIdCard(admissionNo);
  };

  function loadIdCard(admissionNo) {
    const clean = (admissionNo || '').trim().toUpperCase();
    const alertBox = document.getElementById('idCardSearchAlert');

    if (!clean) {
      alertBox.className = 'alert-banner error';
      alertBox.innerHTML = `Please enter an Admission Number to generate ID card.`;
      alertBox.style.display = 'flex';
      return;
    }

    const student = window.StudentDB.getByAdmissionNo(clean);

    // TC4 Part A: Nonexistent student
    if (!student) {
      state.selectedStudentForCard = null;
      elements.idCardPreviewContainer.style.display = 'none';
      elements.idCardEmptyAlert.style.display = 'block';

      alertBox.className = 'alert-banner error';
      alertBox.innerHTML = `
        <strong>🚫 TC4 ENFORCED - STUDENT NOT FOUND:</strong><br>
        Admission No '<b>${clean}</b>' does not exist in the database.<br>
        ID Card generation is strictly prohibited for nonexistent students.
      `;
      alertBox.style.display = 'flex';
      showToast('Student Not Found', `Cannot generate ID card for ${clean}.`, 'error');
      return;
    }

    // Student found: Generate and render card
    state.selectedStudentForCard = student;
    alertBox.style.display = 'none';
    elements.idCardEmptyAlert.style.display = 'none';
    elements.idCardPreviewContainer.style.display = 'flex';

    renderIdCardDOM(student);
    showToast('ID Card Generated', `ID Card loaded for ${student.name} (v${student._version}).`, 'success');
  }

  function renderIdCardDOM(student) {
    document.getElementById('idCardAvatar').src = student.avatar;
    document.getElementById('idCardName').textContent = student.name;
    document.getElementById('idCardAdmission').textContent = student.admissionNo;
    document.getElementById('idCardCourse').textContent = student.course;
    document.getElementById('idCardSection').textContent = student.section;
    document.getElementById('idCardDob').textContent = student.dob;
    document.getElementById('idCardPhone').textContent = student.phone;
    document.getElementById('idCardBlood').textContent = student.bloodGroup || 'O+';
    // ID card ONLY displays allocated institutional BMU email
    const bmuEmailEl = document.getElementById('idCardBmuEmail');
    if (bmuEmailEl) {
      bmuEmailEl.textContent = student.allocatedEmail;
    }
    document.getElementById('idCardBarcodeText').textContent = `*BMU-${student.admissionNo}-v${student._version}*`;
    document.getElementById('idCardMetaVersion').textContent = `v${student._version}`;
  }

  elements.btnLoadIdCard.addEventListener('click', () => {
    loadIdCard(elements.idCardSearchInput.value);
  });

  elements.idCardStudentPicker.addEventListener('change', (e) => {
    if (e.target.value) {
      elements.idCardSearchInput.value = e.target.value;
      loadIdCard(e.target.value);
    }
  });

  elements.btnRegenerateCard.addEventListener('click', () => {
    if (state.selectedStudentForCard) {
      loadIdCard(state.selectedStudentForCard.admissionNo);
      showToast('Card Regenerated', 'Card refreshed with latest database values.', 'info');
    }
  });

  elements.btnPrintCard.addEventListener('click', () => {
    window.print();
  });

  // TC4 Interactive 1-click test button in ID Card tab
  const btnRunTc4Interactive = document.getElementById('btnRunTc4Interactive');
  if (btnRunTc4Interactive) {
    btnRunTc4Interactive.addEventListener('click', async () => {
      // Step 1: Search nonexistent student
      showToast('TC4 Step 1', 'Searching nonexistent student "NONEXISTENT999"...', 'info');
      elements.idCardSearchInput.value = 'NONEXISTENT999';
      loadIdCard('NONEXISTENT999');

      await new Promise(r => setTimeout(r, 2200));

      // Step 2: Pick existing student and update them
      showToast('TC4 Step 2', 'Now updating valid student 24BBA088 and regenerating card...', 'info');
      const targetAdm = '24BBA088';
      const current = window.StudentDB.getByAdmissionNo(targetAdm);
      const newSec = current.section.includes('HONORS') ? 'BBA-2' : 'BBA-HONORS';
      window.StudentDB.updateStudent(targetAdm, { section: newSec, phone: '9789099999' }, current._version);

      // Step 3: Regenerate card
      elements.idCardSearchInput.value = targetAdm;
      loadIdCard(targetAdm);
      showToast('TC4 Verified', `ID card regenerated with updated Section '${newSec}' and Phone '9789099999'!`, 'success');
    });
  }

  // ==========================================
  // Concurrency Split Sandbox (Req E & TC3)
  // ==========================================
  function loadSandboxData() {
    const adm = elements.sandboxStudentSelect.value || '24MBA015';
    state.concurrencyTargetAdm = adm;
    const student = window.StudentDB.getByAdmissionNo(adm);
    if (!student) return;

    // Both Window A & Window B load the same baseline version
    state.windowA = { student: { ...student }, version: student._version };
    state.windowB = { student: { ...student }, version: student._version };

    // Bind Window A
    elements.winAAdmission.textContent = student.admissionNo;
    elements.winAName.textContent = student.name;
    elements.winAVersion.textContent = `v${student._version}`;
    elements.winAPhone.value = student.phone;
    elements.winAAddress.value = student.address;
    elements.winAAlert.style.display = 'none';

    // Bind Window B
    elements.winBAdmission.textContent = student.admissionNo;
    elements.winBName.textContent = student.name;
    elements.winBVersion.textContent = `v${student._version}`;
    elements.winBPhone.value = student.phone;
    elements.winBAddress.value = student.address;
    elements.winBAlert.style.display = 'none';
  }

  elements.sandboxStudentSelect.addEventListener('change', () => {
    loadSandboxData();
  });

  // Window A saves contact number
  elements.btnSaveWinA.addEventListener('click', () => {
    const updatedPhone = elements.winAPhone.value;
    const result = window.StudentDB.updateStudent(
      state.concurrencyTargetAdm,
      { phone: updatedPhone },
      state.windowA.version
    );

    if (result.success) {
      state.windowA.version = result.student._version;
      state.windowA.student = result.student;
      elements.winAVersion.textContent = `v${result.student._version}`;
      elements.winAAlert.className = 'alert-banner success';
      elements.winAAlert.innerHTML = `<strong>✅ Window A Saved:</strong> Phone updated to '${updatedPhone}'. Record advanced to Version v${result.student._version}.`;
      elements.winAAlert.style.display = 'flex';
      showToast('Window A Saved', `Phone updated. Database is now at v${result.student._version}.`, 'success');
    } else {
      elements.winAAlert.className = 'alert-banner error';
      elements.winAAlert.innerHTML = `Window A Error: ${result.message}`;
      elements.winAAlert.style.display = 'flex';
    }
  });

  // Window B tries to save address using stale version
  elements.btnSaveWinB.addEventListener('click', () => {
    const updatedAddress = elements.winBAddress.value;
    const result = window.StudentDB.updateStudent(
      state.concurrencyTargetAdm,
      { address: updatedAddress },
      state.windowB.version // Stale version!
    );

    if (result.success) {
      state.windowB.version = result.student._version;
      state.windowB.student = result.student;
      elements.winBVersion.textContent = `v${result.student._version}`;
      elements.winBAlert.className = 'alert-banner success';
      elements.winBAlert.innerHTML = `Window B Saved: Address updated to '${updatedAddress}'.`;
      elements.winBAlert.style.display = 'flex';
    } else {
      // Concurrency conflict caught!
      elements.winBAlert.className = 'alert-banner error';
      elements.winBAlert.innerHTML = `
        <div>
          <strong>⚡ TC3 OCC CONFLICT DETECTED:</strong><br>
          ${result.message}
          <div style="margin-top: 0.5rem; font-size: 0.82rem; color: #7f1d1d;">
            Window B tried to overwrite using stale Version v${result.conflictDetails?.clientVersion || state.windowB.version}, but Database is at Version v${result.conflictDetails?.serverVersion}.<br>
            <b>Window A's valid updates were safeguarded from being silently lost.</b>
          </div>
        </div>
      `;
      elements.winBAlert.style.display = 'flex';
      showToast('TC3 Conflict Detected', 'Window B prevented from silently overwriting fresh data.', 'warning');
    }
  });

  elements.btnRefreshWinB.addEventListener('click', () => {
    const fresh = window.StudentDB.getByAdmissionNo(state.concurrencyTargetAdm);
    state.windowB = { student: { ...fresh }, version: fresh._version };
    elements.winBVersion.textContent = `v${fresh._version}`;
    elements.winBPhone.value = fresh.phone;
    elements.winBAddress.value = fresh.address;
    elements.winBAlert.className = 'alert-banner info';
    elements.winBAlert.innerHTML = `Window B reloaded with latest Version v${fresh._version} (Phone: ${fresh.phone}). Window B is now synchronized!`;
    elements.winBAlert.style.display = 'flex';
    showToast('Window B Synchronized', `Synchronized with v${fresh._version}.`, 'info');
  });

  // ==========================================
  // Automated Test Suite View Controller
  // ==========================================
  function updateConsoleOutput(entry, allLogs) {
    if (!elements.consoleOutput) return;
    elements.consoleOutput.innerHTML = allLogs.map(log => `
      <div class="log-line">
        <span class="log-time">[${log.timestamp}]</span>
        <span class="log-badge ${log.status}">${log.status}</span>
        <span style="font-weight: 600; color: #38bdf8;">[${log.tcId}]</span>
        <span>${escapeHtml(log.message)}</span>
      </div>
    `).join('');
    elements.consoleOutput.scrollTop = elements.consoleOutput.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  window.TestCaseRunner.onLogUpdate = updateConsoleOutput;

  elements.btnClearConsole.addEventListener('click', () => {
    window.TestCaseRunner.clearLogs();
    elements.consoleOutput.innerHTML = '<div style="color: #64748b; font-style: italic;">Console ready. Click any test above to execute.</div>';
  });

  elements.btnRunAllTests.addEventListener('click', async () => {
    elements.btnRunAllTests.disabled = true;
    elements.btnRunAllTests.textContent = '⏳ Executing All Test Cases...';
    
    const res = await window.TestCaseRunner.runAllTests();
    
    updateBadge(elements.badgeTc1, res.results.TC1.passed);
    updateBadge(elements.badgeTc2, res.results.TC2.passed);
    updateBadge(elements.badgeTc3, res.results.TC3.passed);
    updateBadge(elements.badgeTc4, res.results.TC4.passed);

    elements.btnRunAllTests.disabled = false;
    elements.btnRunAllTests.textContent = '▶️ Run All 4 Test Cases';
    renderStudentList();
  });

  elements.btnRunTC1.addEventListener('click', async () => {
    const res = await window.TestCaseRunner.runTC1();
    updateBadge(elements.badgeTc1, res.passed);
    renderStudentList();
  });

  elements.btnRunTC2.addEventListener('click', async () => {
    const res = await window.TestCaseRunner.runTC2();
    updateBadge(elements.badgeTc2, res.passed);
    renderStudentList();
  });

  elements.btnRunTC3.addEventListener('click', async () => {
    const res = await window.TestCaseRunner.runTC3();
    updateBadge(elements.badgeTc3, res.passed);
    renderStudentList();
  });

  elements.btnRunTC4.addEventListener('click', async () => {
    const res = await window.TestCaseRunner.runTC4();
    updateBadge(elements.badgeTc4, res.passed);
    renderStudentList();
  });

  function updateBadge(el, passed) {
    if (!el) return;
    el.className = `tc-status-pill ${passed ? 'passed' : 'failed'}`;
    el.textContent = passed ? 'PASSED ✅' : 'FAILED ❌';
  }

  // Cross-tab broadcast sync
  window.StudentDB.onSync((event) => {
    renderStudentList();
    if (state.selectedStudentForCard) {
      const fresh = window.StudentDB.getByAdmissionNo(state.selectedStudentForCard.admissionNo);
      if (fresh) renderIdCardDOM(fresh);
    }
    showToast('Multi-Window Sync', 'Student records updated across browser sessions.', 'info');
  });

  // Initial Render
  renderStudentList();
});
