// --- START OF FILE script.js ---

document.addEventListener('DOMContentLoaded', () => {
    const GAS_URL = "https://script.google.com/macros/s/AKfycbwdOCSNV71fRmLjIqIwrk9FwSZbHOX1M2MY7geFTpCu0-D21hkU-BWEpzKy3Pja8BRz4Q/exec";

    const mainContent = document.getElementById('main-content');
    const tabBar = document.getElementById('tab-bar');
    const loader = document.getElementById('loader');
    const settingsModal = document.getElementById('settings-modal');
    const addStaffModal = document.getElementById('add-staff-modal');
    const settingsBtn = document.getElementById('settings-btn');

    const state = {
        currentUser: localStorage.getItem('currentUser') || '',
        language: 'vi',
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
            morning_shift: 'Ca sáng', rotating_shift: 'Đảo ca', evening_shift_only: 'Ca tối',
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
            no_orders: 'Không có đơn hàng', clear_cache: 'Xóa cache', cache_cleared: 'Cache đã được xóa. Tải lại ứng dụng...',
            data_load_error: 'Không thể tải dữ liệu. Vui lòng kiểm tra kết nối mạng và thử lại.'
        },
        en: {
            settings: 'Settings', select_name: 'Select name', shift_type: 'Shift Type',
            morning_shift: 'Morning', rotating_shift: 'Rotating', evening_shift_only: 'Evening',
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
            no_orders: 'No orders found', clear_cache: 'Clear Cache', cache_cleared: 'Cache cleared. Reloading application...',
            data_load_error: 'Could not load data. Please check your network connection and try again.'
        }
    };

    const t = (key) => {
        const lang = (state.language === 'vi' || state.language === 'en') ? state.language : 'vi';
        return translations[lang][key] || key;
    };

    const getWeekString = (date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    const getNextMonday = () => { /* ... no change ... */ };
    const setCache = (key, data) => { /* ... no change ... */ };
    const getCache = (key) => { /* ... no change ... */ };
    const parseDish = (dishString) => { /* ... no change ... */ };
    const showLoader = () => loader.classList.remove('hidden');
    const hideLoader = () => loader.classList.add('hidden');

    const updateUIlanguage = () => { /* ... no change ... */ };

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
            // Don't alert here, let the render function handle the null data
            return null;
        } finally {
            hideLoader();
        }
    }

    const updateOrderTabNotification = () => { /* ... no change ... */ };

    function render() {
        updateUIlanguage();
        updateOrderTabNotification();
        switch (state.currentTab) {
            case 'today': renderToday(); break;
            case 'menu': renderMenu(); break;
            case 'order': renderOrder(); break;
        }
    }
    
    // UPDATED: Added safety check
    function renderToday() {
        if (!state.thisWeekData) {
            mainContent.innerHTML = `<div class="card glass"><p>${t('data_load_error')}</p></div>`;
            return;
        }
        let content = '';
        if (!state.currentUser) {
            content = `<div class="card glass"><p>${t('select_name_prompt')}</p></div>`;
        } else {
            const today = new Date();
            const dayIndex = today.getDay();
            const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][dayIndex];
            
            content += `<div class="card glass"><h2>${t('today')}</h2>`;

            if (dayIndex >= 1 && dayIndex <= 5) {
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

    // UPDATED: Added safety check
    function renderMenu() {
        if (!state.thisWeekData) {
            mainContent.innerHTML = `<div class="card glass"><p>${t('data_load_error')}</p></div>`;
            return;
        }
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

    const updateStaffListView = (searchTerm = '') => { /* ... no change ... */ };
    
    // UPDATED: Added safety checks
    function renderOrder() {
        if (!state.currentUser) {
            mainContent.innerHTML = `<div class="card glass"><p>${t('select_name_prompt')}</p></div>`;
            return;
        }
        const today = new Date().getDay();
        const isEarlyWeek = today >= 1 && today <= 3;
        
        if (isEarlyWeek && !state.thisWeekData) {
             mainContent.innerHTML = `<div class="card glass"><p>${t('data_load_error')}</p></div>`;
             return;
        }
        if (!isEarlyWeek && !state.nextWeekData) {
             mainContent.innerHTML = `<div class="card glass"><p>${t('data_load_error')}</p></div>`;
             return;
        }
        
        const hasOrdered = (data) => data?.orders?.find(o => o.name === state.currentUser && o.mon.dish);
        if (isEarlyWeek) {
            const userOrder = hasOrdered(state.thisWeekData);
            userOrder ? mainContent.innerHTML = createOrderedSummaryHTML(userOrder, t('ordered_this_week')) : renderOrderForm(state.thisWeekString, state.thisWeekData?.menu, t('not_ordered_yet_this_week'));
        } else {
            const userOrder = hasOrdered(state.nextWeekData);
            userOrder ? mainContent.innerHTML = createOrderedSummaryHTML(userOrder, t('ordered_next_week')) : renderOrderForm(state.nextWeekString, state.nextWeekData?.menu, t('not_ordered_yet_next_week'));
        }
    }
    
    const createOrderedSummaryHTML = (order, message) => { /* ... no change ... */ };
    const renderOrderForm = (targetWeekString, menu, message) => { /* ... no change ... */ };
    
    // Attach event listeners
    const setupEventListeners = () => {
        mainContent.addEventListener('click', async (e) => { /* ... no change ... */ });
        tabBar.addEventListener('click', async (e) => { /* ... no change ... */ });
        settingsBtn.onclick = () => settingsModal.classList.remove('hidden');
        document.querySelectorAll('.close-button').forEach(btn => {
            btn.onclick = () => {
                settingsModal.classList.add('hidden');
                addStaffModal.classList.add('hidden');
            };
        });
        window.onclick = (e) => {
            if (e.target == settingsModal || e.target == addStaffModal) {
                settingsModal.classList.add('hidden');
                addStaffModal.classList.add('hidden');
            }
        };
        document.getElementById('add-staff-button').onclick = () => addStaffModal.classList.remove('hidden');
        document.querySelector('#settings-modal .modal-content').addEventListener('change', async (e) => { /* ... no change ... */ });
        document.querySelector('#settings-modal .modal-content').addEventListener('click', async (e) => { /* ... no change ... */ });
        document.getElementById('submit-new-staff').onclick = async () => { /* ... no change ... */ };
    };

    function updateSettingsView() { /* ... no change ... */ }

    async function init() {
        showLoader();
        setupEventListeners();

        const today = new Date();
        state.thisWeekString = getWeekString(today);
        state.nextWeekString = getWeekString(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));

        state.staff = await fetchData({ action: 'getStaff' }) || [];
        
        const currentUserInfo = state.staff.find(s => s.name === state.currentUser);
        if (currentUserInfo && (currentUserInfo.language === 'vi' || currentUserInfo.language === 'en')) {
            state.language = currentUserInfo.language;
        } else {
            const storedLang = localStorage.getItem('language');
            state.language = (storedLang === 'vi' || storedLang === 'en') ? storedLang : 'vi';
        }
        localStorage.setItem('language', state.language);

        const thisWeekPromise = getCache(`getWeekData_${state.thisWeekString}`) || fetchData({ action: 'getWeekData', week: state.thisWeekString });
        const nextWeekPromise = getCache(`getWeekData_${state.nextWeekString}`) || fetchData({ action: 'getWeekData', week: state.nextWeekString });
        const [thisWeekData, nextWeekData] = await Promise.all([thisWeekPromise, nextWeekPromise]);
        
        state.thisWeekData = thisWeekData;
        state.nextWeekData = nextWeekData;
        
        if (state.thisWeekData) setCache(`getWeekData_${state.thisWeekString}`, state.thisWeekData);
        if (state.nextWeekData) setCache(`getWeekData_${state.nextWeekString}`, state.nextWeekData);

        const userSelect = document.getElementById('user-select');
        userSelect.innerHTML = `<option value="">-- ${t('select_name')} --</option>${state.staff.map(s => `<option value="${s.name}" ${state.currentUser === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}`;

        updateSettingsView();

        if (state.currentUser && currentUserInfo) {
            const { name, email, department, shift, language } = currentUserInfo;
            // IMPORTANT: Check for falsy values, not just existence
            if (!name || !email || !department || !shift || !language) {
                settingsModal.classList.remove('hidden');
            }
        } else if (state.currentUser && !currentUserInfo) {
            state.currentUser = '';
            localStorage.removeItem('currentUser');
            userSelect.value = '';
        }

        render();
        hideLoader();
    }
    
    init();
});

