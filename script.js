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

    const state = {
        currentUser: localStorage.getItem('currentUser') || '',
        language: 'vi', // Khởi tạo an toàn, sẽ được ghi đè sau
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
        }
    };
    
    // --- Helper & Cache Functions ---
    // UPDATED: Hàm dịch "bất tử" để không bao giờ gây lỗi
    const t = (key) => {
        const lang = (state.language === 'vi' || state.language === 'en') ? state.language : 'vi';
        const langSet = translations[lang];
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
        } catch (e) { console.error("Error setting cache:", e); }
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
            if (el.placeholder) {
                el.placeholder = t(key);
            } else {
                el.innerText = t(key);
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
    
    function updateOrderTabNotification() { /* ... no change ... */ }

    function render() {
        updateUIlanguage();
        updateOrderTabNotification();
        switch (state.currentTab) {
            case 'today': renderToday(); break;
            case 'menu': renderMenu(); break;
            case 'order': renderOrder(); break;
        }
    }
    
    function renderToday() { /* ... no change ... */ }
    function renderMenu() { /* ... no change ... */ }
    function updateStaffListView(searchTerm = '') { /* ... no change ... */ }
    function renderOrder() { /* ... no change ... */ }
    function createOrderedSummaryHTML(order, message) { /* ... no change ... */ }
    function renderOrderForm(targetWeekString, menu, message) { /* ... no change ... */ }
    function renderOrderDay(day, menu) { /* ... no change ... */ }
    function renderOrderSummary(){ /* ... no change ... */ }

    mainContent.addEventListener('click', async (e) => {
        if (e.target.id === 'eat-button') {
            if (!navigator.onLine) { alert(t('network_error')); return; }
            e.target.disabled = true;
            e.target.innerText = t('eaten');
            fetchData({ action: 'markAsEaten', name: state.currentUser, week: state.thisWeekString })
                .then(result => { if (result) return fetchData({ action: 'getWeekData', week: state.thisWeekString }); })
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

    // UPDATED: Sửa lỗi cú pháp và thêm nút xóa cache
    document.querySelector('#settings-modal .modal-content').addEventListener('click', async (e) => {
        const target = e.target;
        if (target.classList.contains('lang-btn')) {
            state.language = target.dataset.lang;
            localStorage.setItem('language', state.language);
            if (state.currentUser) {
                await fetchData({ action: 'updateLanguage', name: state.currentUser, language: state.language });
                const user = state.staff.find(s => s.name === state.currentUser);
                if (user) user.language = state.language;
            }
            render();
        }
        if (target.id === 'clear-cache-btn') {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('getWeekData_')) {
                    localStorage.removeItem(key);
                }
            });
            alert(t('cache_cleared'));
            location.reload();
        }
    });
    
    document.getElementById('submit-new-staff').onclick = async () => { /* ... no change ... */ };
    
    function updateSettingsView() {
        const currentUserInfo = state.staff.find(s => s.name === state.currentUser);
        if (currentUserInfo) {
            document.getElementById('user-department').value = currentUserInfo.department || '';
            const shiftRadio = document.querySelector(`input[name="shift-type"][value="${currentUserInfo.shift}"]`);
            if (shiftRadio) {
                shiftRadio.checked = true;
            } else {
                const defaultShift = document.querySelector(`input[name="shift-type"]`);
                if(defaultShift) defaultShift.checked = true;
            }
            // Ngôn ngữ đã được set trong init, chỉ cần cập nhật UI
            updateUIlanguage();
        }
    }

    async function init() {
        showLoader();
        // 1. Set up week strings
        const today = new Date();
        state.thisWeekString = getWeekString(today);
        state.nextWeekString = getWeekString(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));

        // 2. Tải dữ liệu nhân viên trước tiên vì nó quyết định ngôn ngữ
        state.staff = await fetchData({ action: 'getStaff' }) || [];
        
        // 3. Xác định ngôn ngữ chính xác
        const currentUserInfo = state.staff.find(s => s.name === state.currentUser);
        if (currentUserInfo && (currentUserInfo.language === 'vi' || currentUserInfo.language === 'en')) {
            state.language = currentUserInfo.language;
        } else {
            const storedLang = localStorage.getItem('language');
            state.language = (storedLang === 'vi' || storedLang === 'en') ? storedLang : 'vi';
        }
        localStorage.setItem('language', state.language);

        // 4. Giờ mới tải dữ liệu còn lại (món ăn, đơn hàng) từ cache hoặc API
        const thisWeekPromise = getCache(`getWeekData_${state.thisWeekString}`) || fetchData({ action: 'getWeekData', week: state.thisWeekString });
        const nextWeekPromise = getCache(`getWeekData_${state.nextWeekString}`) || fetchData({ action: 'getWeekData', week: state.nextWeekString });
        const [thisWeekData, nextWeekData] = await Promise.all([thisWeekPromise, nextWeekPromise]);
        state.thisWeekData = thisWeekData;
        state.nextWeekData = nextWeekData;
        
        setCache(`getWeekData_${state.thisWeekString}`, state.thisWeekData);
        setCache(`getWeekData_${state.nextWeekString}`, state.nextWeekData);

        // 5. Render các thành phần UI cần dịch thuật
        const userSelect = document.getElementById('user-select');
        userSelect.innerHTML = `<option value="">-- ${t('select_name')} --</option>${state.staff.map(s => `<option value="${s.name}" ${state.currentUser === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}`;

        // 6. Cập nhật các trường trong Cài đặt
        updateSettingsView();

        // 7. Kiểm tra thiếu thông tin
        if (state.currentUser && currentUserInfo) {
            const { name, email, department, shift, language } = currentUserInfo;
            if (!name || !email || !department || !shift || !language) {
                settingsModal.classList.remove('hidden');
            }
        } else if (state.currentUser && !currentUserInfo) {
            // Nếu người dùng không còn trong danh sách, xóa thông tin đăng nhập
            state.currentUser = '';
            localStorage.removeItem('currentUser');
            userSelect.value = '';
        }

        // 8. Render tab hiện tại
        render();
        hideLoader();
    }
    
    init();
});
