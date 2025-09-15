// --- START OF FILE script.js ---

document.addEventListener('DOMContentLoaded', () => {
    // !!! QUAN TRỌNG: Dán URL ứng dụng web của bạn vào đây
    const GAS_URL = "https://script.google.com/macros/s/AKfycbwdOCSNV71fRmLjIqIwrk9FwSZbHOX1M2MY7geFTpCu0-D21hkU-BWEpzKy3Pja8BRz4Q/exec";

    const mainContent = document.getElementById('main-content');
    const tabBar = document.getElementById('tab-bar');
    const loader = document.getElementById('loader');
    const settingsModal = document.getElementById('settings-modal');
    const addStaffModal = document.getElementById('add-staff-modal');
    const settingsBtn = document.getElementById('settings-btn');

    const state = {
        currentUser: localStorage.getItem('currentUser') || '',
        language: 'vi', // UPDATED: Khởi tạo mặc định, sẽ được ghi đè ngay sau đó
        currentTab: 'today',
        menuFilterMode: 'auto',
        staff: [], 
        thisWeekData: null, 
        nextWeekData: null,
        thisWeekString: '', 
        nextWeekString: '',
        orderSelection: { mon: null, tue: null, wed: null, thu: null, fri: null }
    };

    const translations = {
        vi: {
            settings: 'Cài đặt', select_name: 'Chọn tên', shift_type: 'Loại ca',
            morning_shift: 'Ca sáng',
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
            no_orders: 'Không có đơn hàng',
        },
        en: {
            settings: 'Settings', select_name: 'Select name', shift_type: 'Shift Type',
            morning_shift: 'Morning',
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
            no_orders: 'No orders found',
        }
    };
    
    // --- Helper & Cache Functions ---
    // UPDATED: Tăng cường độ an toàn cho hàm dịch
    const t = (key) => {
        const langSet = translations[state.language] || translations['vi'];
        return langSet[key] || key;
    };
    
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
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 7; // Lấy thứ 2 của tuần tiếp theo
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
    };
    
    const setCache = (key, data) => {
        try {
            const cacheData = { expiry: getNextMonday(), data: data };
            localStorage.setItem(key, JSON.stringify(cacheData));
        } catch (e) {
            console.error("Error setting cache:", e);
        }
    };

    const getCache = (key) => {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;
        try {
            const item = JSON.parse(itemStr);
            const now = new Date().getTime();
            if (now > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            return item.data;
        } catch (e) {
            console.error("Error getting cache:", e);
            localStorage.removeItem(key);
            return null;
        }
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
            const key = el.dataset.langKey;
            const translation = t(key);
            if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
                if (el.placeholder) el.placeholder = translation;
            } else {
                el.innerText = translation;
            }
        });
        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.lang-btn[data-lang="${state.language}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    };

    async function fetchData(params) {
        showLoader();
        try {
            const url = new URL(GAS_URL);
            Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result = await response.json();
            if (result.status === 'error') throw new Error(result.message);
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
    
    function renderToday() {
        let content = '';
        if (!state.currentUser) {
            content = `<div class="card glass"><p>${t('select_name_prompt')}</p></div>`;
        } else {
            const today = new Date();
            const dayIndex = today.getDay();
            const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayIndex];
            
            content += `<div class="card glass"><h2>${t('today')}</h2>`;

            if (state.thisWeekData && dayIndex >= 1 && dayIndex <= 5) {
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
        if (dayIndex === 0 || dayIndex === 6) {
            container.innerHTML = `<p style="text-align: center; padding: 1rem;">${t('no_menu_today')}</p>`;
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
        }).join('') : `<li style="padding: 1rem 0.5rem; color: var(--text-muted-color);">${t('no_orders')}</li>`;

        const sangOrders = filteredOrders.filter(o => o.shift === 'Sáng').sort((a,b) => a.name.localeCompare(b.name));
        const chieuOrders = filteredOrders.filter(o => o.shift === 'Chiều').sort((a,b) => a.name.localeCompare(b.name));
        
        let html = '';
        if (showSang && sangOrders.length > 0) html += `<div class="shift-group"><h3>${t('morning_shift')}</h3><ul class="staff-list">${createList(sangOrders)}</ul></div>`;
        if (showChieu && chieuOrders.length > 0) html += `<div class="shift-group"><h3>${t('evening_shift')}</h3><ul class="staff-list">${createList(chieuOrders)}</ul></div>`;
        
        if (html === '') {
            html = `<p style="text-align: center; padding: 1rem;">${t('no_orders')}</p>`;
        }
        
        container.innerHTML = html;
    }

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

    function renderOrderForm(targetWeekString, menu, message) {
        const weekNumber = targetWeekString.split('-W')[1];
        let content = `<div class="card glass"><h2>${message}</h2><h3>${t('order_for_week')} ${weekNumber}</h3>`;
        if (!menu || Object.values(menu).every(day => day.length === 0)) { 
            content += `<p>${t('no_menu_yet')}</p></div>`; 
            mainContent.innerHTML = content; 
            return; 
        }
        const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
        content += `<div class="day-tabs">${days.map((day, i) => `<button class="day-tab ${i === 0 ? 'active' : ''}" data-day="${day}">${day}</button>`).join('')}</div>`;
        content += `<div id="order-form-content"></div><div id="order-summary" class="hidden"></div>`;
        mainContent.innerHTML = content;
        renderOrderDay(days[0], menu);
    }
    
    function renderOrderDay(day, menu) {
        //...
    }
    
    function renderOrderSummary(){
        //...
    }

    mainContent.addEventListener('click', async (e) => {
        if (e.target.id === 'eat-button') {
            if (!navigator.onLine) {
                alert(t('network_error'));
                return;
            }
            e.target.disabled = true;
            e.target.innerText = t('eaten');
            
            fetchData({ action: 'markAsEaten', name: state.currentUser, week: state.thisWeekString })
                .then(result => {
                    if (result) {
                        return fetchData({ action: 'getWeekData', week: state.thisWeekString });
                    }
                })
                .then(newData => {
                    if (newData) {
                        state.thisWeekData = newData;
                        setCache(`getWeekData_${state.thisWeekString}`, newData);
                    }
                })
                .catch(err => {
                    e.target.disabled = false;
                    e.target.innerText = t('confirm_eaten');
                    alert('Đã có lỗi xảy ra, vui lòng thử lại.');
                });
        }
        // ... Các event listener khác
    });

    tabBar.addEventListener('click', async (e) => {
        if (e.target.classList.contains('tab-link')) {
            const tab = e.target.dataset.tab;
            if (tab === state.currentTab) return;

            document.querySelector('.tab-link.active').classList.remove('active');
            e.target.classList.add('active');
            state.currentTab = tab;

            if (tab === 'menu') {
                const freshData = await fetchData({ action: 'getWeekData', week: state.thisWeekString });
                if (freshData) {
                    state.thisWeekData = freshData;
                    setCache(`getWeekData_${state.thisWeekString}`, freshData);
                }
            }
            render();
        }
    });

    settingsBtn.onclick = () => settingsModal.classList.remove('hidden');
    document.querySelectorAll('.close-button').forEach(btn => btn.onclick = () => { settingsModal.classList.add('hidden'); addStaffModal.classList.add('hidden'); });
    window.onclick = (e) => { if (e.target == settingsModal || e.target == addStaffModal) { settingsModal.classList.add('hidden'); addStaffModal.classList.add('hidden'); } };
    document.getElementById('add-staff-button').onclick = () => { addStaffModal.classList.remove('hidden'); };
    
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
        if (e.target.id === 'user-department') {
            const newDepartment = e.target.value.trim();
            if (newDepartment) {
                await fetchData({ action: 'updateDepartment', name: state.currentUser, department: newDepartment });
                const user = state.staff.find(s => s.name === state.currentUser);
                if (user) user.department = newDepartment;
            }
        }
    });

    document.querySelector('#settings-modal .modal-content').click('click', async (e) => {
        if (e.target.classList.contains('lang-btn')) {
            state.language = e.target.dataset.lang;
            localStorage.setItem('language', state.language);
            if (state.currentUser) {
                await fetchData({ action: 'updateLanguage', name: state.currentUser, language: state.language });
                const user = state.staff.find(s => s.name === state.currentUser);
                if (user) user.language = state.language;
            }
            render();
        }
    });
    
    document.getElementById('submit-new-staff').onclick = async () => {
        // ...
    };
    
    function updateSettingsView() {
        const currentUserInfo = state.staff.find(s => s.name === state.currentUser);
        if (currentUserInfo) {
            document.getElementById('user-department').value = currentUserInfo.department || '';
            const shiftRadio = document.querySelector(`input[name="shift-type"][value="${currentUserInfo.shift}"]`);
            if (shiftRadio) shiftRadio.checked = true;
            else { // Nếu ca không hợp lệ, reset
                 const defaultShift = document.querySelector(`input[name="shift-type"]`);
                 if(defaultShift) defaultShift.checked = true;
            }
            // Ngôn ngữ đã được set trong init, chỉ cần cập nhật UI
            updateUIlanguage();
        }
    }

    async function init() {
        // 1. Set up week strings
        const today = new Date();
        state.thisWeekString = getWeekString(today);
        state.nextWeekString = getWeekString(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));

        // 2. Fetch all necessary data, using cache where possible
        const staffPromise = fetchData({ action: 'getStaff' });
        const thisWeekPromise = getCache(`getWeekData_${state.thisWeekString}`) || fetchData({ action: 'getWeekData', week: state.thisWeekString });
        const nextWeekPromise = getCache(`getWeekData_${state.nextWeekString}`) || fetchData({ action: 'getWeekData', week: state.nextWeekString });
        
        const [staffData, thisWeekData, nextWeekData] = await Promise.all([staffPromise, thisWeekPromise, nextWeekPromise]);

        state.staff = staffData || [];
        state.thisWeekData = thisWeekData;
        state.nextWeekData = nextWeekData;
        
        setCache(`getWeekData_${state.thisWeekString}`, state.thisWeekData);
        setCache(`getWeekData_${state.nextWeekString}`, state.nextWeekData);

        // 3. **FIX**: Determine the correct language BEFORE rendering anything.
        const currentUserInfo = state.staff.find(s => s.name === state.currentUser);
        if (currentUserInfo && (currentUserInfo.language === 'vi' || currentUserInfo.language === 'en')) {
            state.language = currentUserInfo.language;
        } else {
            const storedLang = localStorage.getItem('language');
            state.language = (storedLang === 'vi' || storedLang === 'en') ? storedLang : 'vi';
        }
        localStorage.setItem('language', state.language);

        // 4. Now that language is set, render UI components
        const userSelect = document.getElementById('user-select');
        userSelect.innerHTML = `<option value="">-- ${t('select_name')} --</option>${state.staff.map(s => `<option value="${s.name}" ${state.currentUser === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}`;

        // 5. Update the settings modal with the user's full info
        updateSettingsView();

        // 6. Check for missing info and show modal if necessary
        if (state.currentUser && currentUserInfo) {
            const { name, email, department, shift, language } = currentUserInfo;
            if (!name || !email || !department || !shift || !language) {
                settingsModal.classList.remove('hidden');
            }
        } else if (state.currentUser) {
            state.currentUser = '';
            localStorage.removeItem('currentUser');
            userSelect.value = '';
        }

        // 7. Final render of the current tab
        render();
    }
    
    init();
});
