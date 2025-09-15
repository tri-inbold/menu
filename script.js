// --- START OF FILE script.js ---

document.addEventListener('DOMContentLoaded', () => {
    // !!! QUAN TRỌNG: Dán URL ứng dụng web của bạn vào đây
    const GAS_URL = "https://script.google.com/macros/s/AKfycbwp7fkxzx9cxChbpyZhmv_oZLkzcyxKVxh9JPIqwLu9tc620PA98b0Me_mq-sSKj9BWpQ/exec";

    const mainContent = document.getElementById('main-content');
    const tabBar = document.getElementById('tab-bar');
    const loader = document.getElementById('loader');
    const settingsModal = document.getElementById('settings-modal');
    const addStaffModal = document.getElementById('add-staff-modal');
    const settingsBtn = document.getElementById('settings-btn');

    // UPDATED: state lưu thêm thông tin cache
    const state = {
        currentUser: localStorage.getItem('currentUser') || '',
        language: localStorage.getItem('language') || 'vi',
        currentTab: 'today',
        menuFilterMode: 'auto',
        staff: [], 
        thisWeekData: null, 
        nextWeekData: null,
        thisWeekString: '', 
        nextWeekString: '',
        orderSelection: { mon: null, tue: null, wed: null, thu: null, fri: null }
    };

    // UPDATED: Thêm bản dịch mới
    const translations = {
        vi: {
            settings: 'Cài đặt', select_name: 'Chọn tên', shift_type: 'Loại ca',
            morning_shift: 'Ca sáng', // Đã đổi
            rotating_shift: 'Đảo ca', evening_shift_only: 'Ca tối',
            language: 'Ngôn ngữ', add_member: 'Thêm thành viên', add_new_member: 'Thành viên mới', add: 'Thêm',
            menu: 'Thực Đơn', today: 'Hôm Nay', order: 'Đặt Món',
            ordered_this_week: 'Bạn đã đặt món cho tuần này', ordered_next_week: 'Bạn đã đặt món cho tuần sau',
            not_ordered_yet_this_week: 'Bạn chưa đặt món cho tuần này', not_ordered_yet_next_week: 'Bạn chưa đặt món cho tuần sau',
            order_for_week: 'Đặt món cho Tuần', confirm_eaten: 'Xác nhận đã ăn',
            not_ordered_today: 'Bạn chưa đặt món cho hôm nay.', no_menu_today: 'Hôm nay không phục vụ bữa ăn.',
            search_placeholder: 'Tìm kiếm nhân viên...', evening_shift: 'Ca Chiều',
            no_menu_yet: 'Thực đơn chưa được cập nhật.', confirm_order: 'Xác nhận đơn hàng', submit_order_week: 'Hoàn tất đặt món',
            eaten: 'Đã ăn', select_name_prompt: 'Vui lòng chọn tên của bạn trong phần Cài đặt.', department: 'Phòng ban',
            update_success: 'Cập nhật thành công!', network_error: 'Không có kết nối mạng, vui lòng thử lại.',
        },
        en: {
            settings: 'Settings', select_name: 'Select name', shift_type: 'Shift Type',
            morning_shift: 'Morning', // Đã đổi
            rotating_shift: 'Rotating', evening_shift_only: 'Evening',
            language: 'Language', add_member: 'Add Member', add_new_member: 'New Member', add: 'Add',
            menu: 'Menu', today: 'Today', order: 'Order',
            ordered_this_week: 'You have ordered for this week', ordered_next_week: 'You have ordered for next week',
            not_ordered_yet_this_week: 'You have not ordered for this week', not_ordered_yet_next_week: 'You have not ordered for next week',
            order_for_week: 'Order for Week', confirm_eaten: 'Confirm Eaten',
            not_ordered_today: 'You have not ordered for today.', no_menu_today: 'No meal served today.',
            search_placeholder: 'Search for staff...', evening_shift: 'Evening Shift',
            no_menu_yet: 'Menu is not updated yet.', confirm_order: 'Confirm Order', submit_order_week: 'Complete Order',
            eaten: 'Eaten', select_name_prompt: 'Please select your name in Settings.', department: 'Department',
            update_success: 'Update successful!', network_error: 'No internet connection, please try again.',
        }
    };
    
    // --- Helper & Cache Functions ---
    const t = (key) => translations[state.language][key] || key;
    
    const getWeekString = (date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    const getNextMonday = () => {
        const d = new Date();
        d.setDate(d.getDate() + (1 + 7 - d.getDay()) % 7);
        if (d < new Date()) d.setDate(d.getDate() + 7); // Nếu hôm nay là thứ 2, lấy thứ 2 tuần sau
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    };
    
    // NEW: Các hàm quản lý cache
    const setCache = (key, data) => {
        const cacheData = {
            expiry: getNextMonday(),
            data: data
        };
        localStorage.setItem(key, JSON.stringify(cacheData));
    };
    const getCache = (key) => {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;
        const item = JSON.parse(itemStr);
        const now = new Date().getTime();
        if (now > item.expiry) {
            localStorage.removeItem(key);
            return null;
        }
        return item.data;
    };

    const parseDish = (dishString) => {
        if (!dishString) return '';
        const parts = dishString.split('|');
        return (state.language === 'en' && parts.length > 1) ? parts[1].trim() : parts[0].trim();
    };

    const showLoader = () => loader.classList.remove('hidden');
    const hideLoader = () => loader.classList.add('hidden');
    
    const updateUIlanguage = () => {
        document.querySelectorAll('[data-lang-key]').forEach(el => {
            if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
                if (el.placeholder) el.placeholder = t(el.dataset.langKey);
            } else {
                el.innerText = t(el.dataset.langKey);
            }
        });
        // Cập nhật button ngôn ngữ
        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.lang-btn[data-lang="${state.language}"]`)?.classList.add('active');
    };

    async function fetchData(params, useCache = false) {
        const cacheKey = useCache ? `${params.action}_${params.week}` : null;
        if (useCache) {
            const cachedData = getCache(cacheKey);
            if (cachedData) return cachedData;
        }

        showLoader();
        try {
            const url = new URL(GAS_URL);
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.status === 'error') throw new Error(result.message);
            
            if (useCache && result.data) {
                setCache(cacheKey, result.data);
            }
            return result.data;
        } catch (error) {
            console.error('Fetch error:', error);
            alert(`Lỗi: ${error.message}`);
            return null;
        } finally {
            hideLoader();
        }
    }
    
    function updateOrderTabNotification() {
        const orderTab = document.querySelector('.tab-link[data-tab="order"]');
        if (!orderTab || !state.currentUser) return;
        const today = new Date().getDay();
        const isEarlyWeek = today >= 1 && today <= 3;
        const hasOrdered = isEarlyWeek
            ? state.thisWeekData?.orders?.some(o => o.name === state.currentUser && o.mon.dish)
            : state.nextWeekData?.orders?.some(o => o.name === state.currentUser && o.mon.dish);
        if (!hasOrdered) orderTab.classList.add('needs-attention');
        else orderTab.classList.remove('needs-attention');
    }

    function render() {
        updateUIlanguage();
        updateOrderTabNotification();
        switch (state.currentTab) {
            case 'today': renderToday(); break;
            case 'menu': renderMenu(); break;
            case 'order': renderOrder(); break;
        }
    }
    
    // UPDATED: Xử lý Thứ 7, CN
    function renderToday() {
        let content = '';
        if (!state.currentUser) {
            content = `<div class="card glass"><p>${t('select_name_prompt')}</p></div>`;
        } else {
            const today = new Date();
            const dayIndex = today.getDay();
            const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayIndex];
            
            content += `<div class="card glass"><h2>${t('today')}</h2>`;

            if (state.thisWeekData && dayIndex >= 1 && dayIndex <= 5) { // Chỉ hiển thị từ T2-T6
                const userOrder = state.thisWeekData.orders.find(o => o.name === state.currentUser);
                if (userOrder && userOrder[dayKey]?.dish) {
                    const dish = userOrder[dayKey];
                    const isEaten = dish.eaten === 'đã ăn';
                    content += `<div class="dish-name">${parseDish(dish.dish)}</div><button id="eat-button" class="btn-primary" ${isEaten ? 'disabled' : ''}>${isEaten ? t('eaten') : t('confirm_eaten')}</button>`;
                } else { 
                    content += `<p>${t('not_ordered_today')}</p>`; 
                }
            } else { 
                content += `<p>${t('no_menu_today')}</p>`; 
            }
            content += `</div>`;
        }
        mainContent.innerHTML = content;
    }

    // UPDATED: Bọc nội dung trong card
    function renderMenu() {
        mainContent.innerHTML = `
            <div class="card glass menu-container">
                <div class="search-bar-container">
                    <input type="text" id="search-staff" placeholder="${t('search_placeholder')}">
                    <button id="menu-filter-btn" class="icon-btn"></button>
                </div>
                <div id="staff-list-container"></div>
            </div>`;
        updateStaffListView();
        document.getElementById('search-staff').addEventListener('input', (e) => updateStaffListView(e.target.value));
        document.getElementById('menu-filter-btn').addEventListener('click', () => {
            state.menuFilterMode = state.menuFilterMode === 'auto' ? 'all' : 'auto';
            updateStaffListView(document.getElementById('search-staff').value);
        });
    }

    function updateStaffListView(searchTerm = '') {
        const container = document.getElementById('staff-list-container');
        const filterBtn = document.getElementById('menu-filter-btn');
        if (!container || !filterBtn) return;

        const dayIndex = new Date().getDay();
        if (dayIndex === 0 || dayIndex === 6) { // Không hiển thị gì vào T7, CN
            container.innerHTML = `<p>${t('no_menu_today')}</p>`;
            filterBtn.style.display = 'none';
            return;
        }
        filterBtn.style.display = 'block';

        const hour = new Date().getHours();
        const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayIndex];
        
        const filteredOrders = state.thisWeekData?.orders.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];
        
        let showSang = true, showChieu = true;
        if (state.menuFilterMode === 'auto') {
            filterBtn.innerHTML = `<i class="fas ${hour < 15 ? 'fa-sun' : 'fa-moon'}"></i>`;
            if (hour < 15) showChieu = false; else showSang = false;
        } else { filterBtn.innerHTML = `<i class="fas fa-smile"></i>`; }
        
        const createList = (list) => list.length > 0 ? list.map(order => {
            const dishInfo = order[dayKey];
            const isEaten = dishInfo?.eaten === 'đã ăn';
            return `<li class="staff-item ${isEaten ? 'eaten' : ''}">
                <label class="eaten-checkbox"><input type="checkbox" class="eaten-checkbox-input" data-name="${order.name}" ${isEaten ? 'checked' : ''}><span class="checkmark"></span></label>
                <div class="staff-details">
                    <span class="staff-name">${order.name}</span>
                    <span class="staff-dish">${dishInfo?.dish ? parseDish(dishInfo.dish) : ''}</span>
                </div></li>`;
        }).join('') : `<li><p style="padding: 1rem 0.5rem; color: var(--text-muted-color);">${t('no_orders') || 'Không có đơn'}</p></li>`;

        const sangOrders = filteredOrders.filter(o => o.shift === 'Sáng').sort((a,b) => a.name.localeCompare(b.name));
        const chieuOrders = filteredOrders.filter(o => o.shift === 'Chiều').sort((a,b) => a.name.localeCompare(b.name));
        
        let html = '';
        if (showSang) html += `<div class="shift-group"><h3>${t('morning_shift')}</h3><ul class="staff-list">${createList(sangOrders)}</ul></div>`;
        if (showChieu) html += `<div class="shift-group"><h3>${t('evening_shift')}</h3><ul class="staff-list">${createList(chieuOrders)}</ul></div>`;
        
        container.innerHTML = html;
    }

    // ... (Các hàm renderOrder, createOrderedSummaryHTML, renderOrderForm, etc. không thay đổi nhiều)
    function renderOrder() {
        if (!state.currentUser) { mainContent.innerHTML = `<div class="card glass"><p>${t('select_name_prompt')}</p></div>`; return; }
        const today = new Date().getDay();
        const isEarlyWeek = today >= 1 && today <= 3;
        const hasOrdered = (data) => data?.orders?.find(o => o.name === state.currentUser && o.mon.dish);
        if (isEarlyWeek) {
            const userOrder = hasOrdered(state.thisWeekData);
            userOrder ? mainContent.innerHTML = createOrderedSummaryHTML(userOrder, t('ordered_this_week')) : renderOrderForm(state.thisWeekString, state.thisWeekData?.menu, t('not_ordered_yet_this_week'));
        } else {
            const userOrder = hasOrdered(state.nextWeekData);
            userOrder ? mainContent.innerHTML = createOrderedSummaryHTML(userOrder, t('ordered_next_week')) : renderOrderForm(state.nextWeekString, state.nextWeekData?.menu, t('not_ordered_yet_next_week'));
        }
    }

    function createOrderedSummaryHTML(order, message) {
        return `<div class="card glass"><h2>${message}</h2><ul class="ordered-summary">
            <li><strong>Thứ 2:</strong> <span>${parseDish(order.mon.dish)}</span></li><li><strong>Thứ 3:</strong> <span>${parseDish(order.tue.dish)}</span></li>
            <li><strong>Thứ 4:</strong> <span>${parseDish(order.wed.dish)}</span></li><li><strong>Thứ 5:</strong> <span>${parseDish(order.thu.dish)}</span></li>
            <li><strong>Thứ 6:</strong> <span>${parseDish(order.fri.dish)}</span></li></ul></div>`;
    }
    
    // ...
    mainContent.addEventListener('click', async (e) => {
        // UPDATED: Tối ưu UX cho nút "Xác nhận đã ăn"
        if (e.target.id === 'eat-button') {
            if (!navigator.onLine) {
                alert(t('network_error'));
                return;
            }
            // UI Update lạc quan
            e.target.disabled = true;
            e.target.innerText = t('eaten');
            
            // Call API ngầm
            fetchData({ action: 'markAsEaten', name: state.currentUser, week: state.thisWeekString })
                .then(result => {
                    if (result) {
                        // Tải lại dữ liệu và cập nhật cache
                        return fetchData({ action: 'getWeekData', week: state.thisWeekString }, true);
                    }
                })
                .then(newData => {
                    if (newData) state.thisWeekData = newData;
                })
                .catch(err => {
                    // Nếu lỗi, hoàn tác UI và báo cho người dùng
                    e.target.disabled = false;
                    e.target.innerText = t('confirm_eaten');
                    alert('Đã có lỗi xảy ra, vui lòng thử lại.');
                });
        }
        
        // ... Các event listener khác
    });

    // UPDATED: Logic chuyển tab để xử lý cache
    tabBar.addEventListener('click', async (e) => {
        if (e.target.classList.contains('tab-link')) {
            const tab = e.target.dataset.tab;
            if (tab === state.currentTab) return;

            document.querySelector('.tab-link.active').classList.remove('active');
            e.target.classList.add('active');
            state.currentTab = tab;

            // Nếu chuyển sang tab Thực đơn, luôn tải lại dữ liệu mới nhất
            if (tab === 'menu') {
                const freshData = await fetchData({ action: 'getWeekData', week: state.thisWeekString }, false); // false = không dùng cache
                if (freshData) {
                    state.thisWeekData = freshData;
                    setCache(`getWeekData_${state.thisWeekString}`, freshData); // Cập nhật lại cache
                }
            }
            render();
        }
    });

    settingsBtn.onclick = () => settingsModal.classList.remove('hidden');
    document.querySelectorAll('.close-button').forEach(btn => btn.onclick = () => { settingsModal.classList.add('hidden'); addStaffModal.classList.add('hidden'); });
    window.onclick = (e) => { if (e.target == settingsModal || e.target == addStaffModal) { settingsModal.classList.add('hidden'); addStaffModal.classList.add('hidden'); } };
    document.getElementById('add-staff-button').onclick = () => { addStaffModal.classList.remove('hidden'); };
    
    // UPDATED: Thêm sự kiện cho phòng ban và ngôn ngữ
    document.querySelector('#settings-modal .modal-content').addEventListener('change', async (e) => {
        if (e.target.id === 'user-select') {
            state.currentUser = e.target.value;
            localStorage.setItem('currentUser', state.currentUser);
            updateSettingsView();
            render();
        }
        if (e.target.name === 'shift-type') {
            const newShiftType = e.target.value;
            await fetchData({ action: 'updateShift', name: state.currentUser, shiftType: newShiftType });
            const user = state.staff.find(s => s.name === state.currentUser);
            if (user) user.shift = newShiftType;
        }
        // NEW: Cập nhật phòng ban
        if (e.target.id === 'user-department') {
            const newDepartment = e.target.value;
            await fetchData({ action: 'updateDepartment', name: state.currentUser, department: newDepartment });
            const user = state.staff.find(s => s.name === state.currentUser);
            if (user) user.department = newDepartment;
        }
    });

    document.querySelector('#settings-modal .modal-content').addEventListener('click', async (e) => {
        if (e.target.classList.contains('lang-btn')) {
            state.language = e.target.dataset.lang;
            localStorage.setItem('language', state.language);
            // Cập nhật ngôn ngữ trên backend
            if (state.currentUser) {
                await fetchData({ action: 'updateLanguage', name: state.currentUser, language: state.language });
                const user = state.staff.find(s => s.name === state.currentUser);
                if (user) user.language = state.language;
            }
            render();
        }
    });

    // ... (Hàm submit-new-staff không đổi)
    
    // NEW: Hàm cập nhật view Cài đặt
    function updateSettingsView() {
        const currentUserInfo = state.staff.find(s => s.name === state.currentUser);
        if (currentUserInfo) {
            // Cập nhật phòng ban
            document.getElementById('user-department').value = currentUserInfo.department || '';
            // Cập nhật ca
            const shiftRadio = document.querySelector(`input[name="shift-type"][value="${currentUserInfo.shift}"]`);
            if (shiftRadio) shiftRadio.checked = true;
            // Cập nhật ngôn ngữ
            state.language = currentUserInfo.language || localStorage.getItem('language') || 'vi';
            localStorage.setItem('language', state.language);
            updateUIlanguage();
        }
    }

    async function init() {
        const today = new Date();
        state.thisWeekString = getWeekString(today);
        state.nextWeekString = getWeekString(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));
        
        // UPDATED: Tải dữ liệu từ cache trước, sau đó mới fetch API nếu cần
        const [staffData, thisWeekData, nextWeekData] = await Promise.all([
            fetchData({ action: 'getStaff' }),
            fetchData({ action: 'getWeekData', week: state.thisWeekString }, true), // true = dùng cache
            fetchData({ action: 'getWeekData', week: state.nextWeekString }, true) // true = dùng cache
        ]);

        state.staff = staffData || [];
        state.thisWeekData = thisWeekData;
        state.nextWeekData = nextWeekData;
        
        const userSelect = document.getElementById('user-select');
        userSelect.innerHTML = `<option value="">-- ${t('select_name')} --</option>${state.staff.map(s => `<option value="${s.name}" ${state.currentUser === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}`;
        
        updateSettingsView(); // Cập nhật các trường trong setting

        // NEW: Kiểm tra thiếu thông tin và tự mở Cài đặt
        const currentUserInfo = state.staff.find(s => s.name === state.currentUser);
        if (state.currentUser && currentUserInfo) {
            const { name, email, department, shift, language } = currentUserInfo;
            if (!name || !email || !department || !shift || !language) {
                settingsModal.classList.remove('hidden');
            }
        } else if (state.currentUser) {
            // Tên người dùng có trong localStorage nhưng không có trong danh sách staff
            localStorage.removeItem('currentUser');
            state.currentUser = '';
        }
        
        render();
    }
    
    init();
});
