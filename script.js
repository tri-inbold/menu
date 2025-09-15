document.addEventListener('DOMContentLoaded', () => {
    // !!! QUAN TRỌNG: Dán URL ứng dụng web của bạn vào đây
    const GAS_URL = "https://script.google.com/macros/s/AKfycbzCFNxytr928OB4mCGrjhJ6q6PsGu9tHols3S2nyDZF-EvyPZ1E0Dm9iNjrJAS3wS_fpw/exec";

    const mainContent = document.getElementById('main-content');
    const tabBar = document.getElementById('tab-bar');
    const loader = document.getElementById('loader');
    const settingsModal = document.getElementById('settings-modal');
    const addStaffModal = document.getElementById('add-staff-modal');
    const settingsBtn = document.getElementById('settings-btn');

    // SỬA LỖI: Chuyển đổi ngôn ngữ sang chữ thường ngay khi đọc để đảm bảo khớp key
    const state = {
        currentUser: localStorage.getItem('currentUser') || '',
        language: (localStorage.getItem('language') || 'vi').toLowerCase(),
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
            menu: 'Thực Đơn', today: 'Hôm Nay', order: 'Đặt Món', department: 'Phòng ban', save_settings: 'Lưu thay đổi',
            ordered_this_week: 'Bạn đã đặt món cho tuần này', ordered_next_week: 'Bạn đã đặt món cho tuần sau',
            not_ordered_yet_this_week: 'Bạn chưa đặt món cho tuần này', not_ordered_yet_next_week: 'Bạn chưa đặt món cho tuần sau',
            order_for_week: 'Đặt món cho Tuần', confirm_eaten: 'Xác nhận đã ăn', eaten: 'Đã xác nhận',
            not_ordered_today: 'Bạn chưa đặt món cho hôm nay.', no_menu_today: 'Hôm nay không phục vụ bữa ăn.',
            search_placeholder: 'Tìm kiếm nhân viên...', evening_shift: 'Ca Chiều',
            no_menu_yet: 'Thực đơn chưa được cập nhật.', confirm_order: 'Xác nhận đơn hàng', submit_order_week: 'Hoàn tất đặt món',
            select_name_prompt: 'Vui lòng chọn tên của bạn trong phần Cài đặt.',
            offline_error: 'Không có kết nối mạng. Vui lòng thử lại sau.',
            action_successful: 'Thao tác thành công!',
            info_missing: 'Thông tin của bạn chưa đầy đủ, vui lòng cập nhật.',
            fetch_error: 'Không thể tải dữ liệu. Vui lòng kiểm tra kết nối và thử lại.',
        },
        en: {
            settings: 'Settings', select_name: 'Select name', shift_type: 'Shift Type',
            morning_shift: 'Morning', rotating_shift: 'Rotating', evening_shift_only: 'Evening',
            language: 'Language', add_member: 'Add Member', add_new_member: 'New Member', add: 'Add',
            menu: 'Menu', today: 'Today', order: 'Order', department: 'Department', save_settings: 'Save Changes',
            ordered_this_week: 'You have ordered for this week', ordered_next_week: 'You have ordered for next week',
            not_ordered_yet_this_week: 'You have not ordered for this week', not_ordered_yet_next_week: 'You have not ordered for next week',
            order_for_week: 'Order for Week', confirm_eaten: 'Confirm Eaten', eaten: 'Confirmed',
            not_ordered_today: 'You have not ordered for today.', no_menu_today: 'No meal served today.',
            search_placeholder: 'Search for staff...', evening_shift: 'Evening Shift',
            no_menu_yet: 'Menu is not updated yet.', confirm_order: 'Confirm Order', submit_order_week: 'Complete Order',
            select_name_prompt: 'Please select your name in Settings.',
            offline_error: 'No internet connection. Please try again later.',
            action_successful: 'Action successful!',
            info_missing: 'Your profile is incomplete, please update.',
            fetch_error: 'Could not load data. Please check your connection and try again.',
        }
    };

    // --- Helper & Caching Functions ---
    const t = (key) => (translations[state.language] && translations[state.language][key]) || key;
    const getMonday = (d) => {
        d = new Date(d);
        const day = d.getDay(), diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff)).setHours(0, 0, 0, 0);
    };

    const cache = {
        get: (key) => {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return null;
            const item = JSON.parse(itemStr);
            const currentMonday = getMonday(new Date());
            if (item.monday !== currentMonday) {
                localStorage.removeItem(key);
                return null;
            }
            return item.data;
        },
        set: (key, data) => {
            const monday = getMonday(new Date());
            const item = { data, monday };
            localStorage.setItem(key, JSON.stringify(item));
        }
    };

    const getWeekString = (date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
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
            if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
                el.placeholder = t(key);
            } else {
                el.innerText = t(key);
            }
        });
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === state.language);
        });
    };

    async function fetchData(params, useCache = false) {
        const cacheKey = `data_${params.action}_${params.week || ''}`;
        if (useCache) {
            const cachedData = cache.get(cacheKey);
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
            if (useCache) cache.set(cacheKey, result.data);
            return result.data;
        } catch (error) {
            console.error('Fetch error:', error);
            alert(`${t('fetch_error')}: ${error.message}`); // Thông báo lỗi thân thiện hơn
            return null;
        } finally {
            hideLoader();
        }
    }

    function checkUserInfo() {
        if (!state.currentUser) return;
        const user = state.staff.find(s => s.name === state.currentUser);
        if (!user || !user.email || !user.department || !user.shift || !user.language) {
            alert(t('info_missing'));
            settingsModal.classList.remove('hidden');
        }
    }

    async function render() {
        updateUIlanguage();
        switch (state.currentTab) {
            case 'today': await renderToday(); break;
            case 'menu': await renderMenu(); break;
            case 'order': await renderOrder(); break;
        }
    }

    async function renderToday() {
        state.thisWeekData = await fetchData({ action: 'getWeekData', week: state.thisWeekString }, true);
        
        let content = '';
        if (!state.currentUser) {
            content = `<div class="card glass"><p>${t('select_name_prompt')}</p></div>`;
        } else {
            let today = new Date().getDay();
            if (today === 6 || today === 0) today = 5;
            
            const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][today];
            content += `<div class="card glass"><h2>${t('today')}</h2>`;
            
            if (state.thisWeekData && dayKey !== 'sun' && dayKey !== 'sat') {
                const userOrder = state.thisWeekData.orders.find(o => o.name === state.currentUser);
                if (userOrder && userOrder[dayKey]?.dish) {
                    const dish = userOrder[dayKey];
                    const isEaten = dish.eaten === 'đã ăn';
                    content += `<div class="dish-name">${parseDish(dish.dish)}</div><button id="eat-button" class="btn-primary" ${isEaten ? 'disabled' : ''}>${isEaten ? t('eaten') : t('confirm_eaten')}</button>`;
                } else { content += `<p>${t('not_ordered_today')}</p>`; }
            } else { content += `<p>${t('no_menu_today')}</p>`; }
            content += `</div>`;
        }
        mainContent.innerHTML = content;
    }

    async function renderMenu() {
        mainContent.innerHTML = `
            <div class="card glass">
                <div class="search-bar-container">
                    <input type="text" id="search-staff" placeholder="${t('search_placeholder')}">
                    <button id="menu-filter-btn" class="icon-btn"></button>
                </div>
                <div id="staff-list-container"></div>
            </div>`;
        
        state.thisWeekData = await fetchData({ action: 'getWeekData', week: state.thisWeekString });
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
        const hour = new Date().getHours();
        const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
        
        const filteredOrders = state.thisWeekData?.orders.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];
        
        let showSang = true, showChieu = true;
        if (state.menuFilterMode === 'auto') {
            filterBtn.innerHTML = `<i class="fas ${hour < 15 ? 'fa-sun' : 'fa-moon'}"></i>`;
            if (hour < 15) showChieu = false; else showSang = false;
        } else { filterBtn.innerHTML = `<i class="fas fa-users"></i>`; }
        
        const createList = (list) => list.map(order => {
            const dishInfo = order[dayKey];
            const isEaten = dishInfo?.eaten === 'đã ăn';
            return `<li class="staff-item ${isEaten ? 'eaten' : ''}">
                <label class="eaten-checkbox"><input type="checkbox" class="eaten-checkbox-input" data-name="${order.name}" ${isEaten ? 'checked' : ''}><span class="checkmark"></span></label>
                <div class="staff-details">
                    <span class="staff-name">${order.name}</span>
                    <span class="staff-dish">${dishInfo?.dish ? parseDish(dishInfo.dish) : ''}</span>
                </div></li>`;
        }).join('');
        
        const sangOrders = filteredOrders.filter(o => o.shift === 'Sáng').sort((a,b) => a.name.localeCompare(b.name));
        const chieuOrders = filteredOrders.filter(o => o.shift === 'Chiều').sort((a,b) => a.name.localeCompare(b.name));
        
        let html = '';
        if (showSang && sangOrders.length > 0) html += `<div class="shift-group"><h3>${t('morning_shift')}</h3><ul class="staff-list">${createList(sangOrders)}</ul></div>`;
        if (showChieu && chieuOrders.length > 0) html += `<div class="shift-group"><h3>${t('evening_shift')}</h3><ul class="staff-list">${createList(chieuOrders)}</ul></div>`;
        
        container.innerHTML = html || `<p style="text-align: center; padding: 1rem;">Không có dữ liệu.</p>`;
    }

    async function renderOrder() {
        if (!state.currentUser) { mainContent.innerHTML = `<div class="card glass"><p>${t('select_name_prompt')}</p></div>`; return; }
        
        const today = new Date().getDay();
        const isEarlyWeek = today >= 1 && today <= 3;
        
        const targetWeekString = isEarlyWeek ? state.thisWeekString : state.nextWeekString;
        const targetWeekData = await fetchData({ action: 'getWeekData', week: targetWeekString }, true);
        
        const userOrder = targetWeekData?.orders?.find(o => o.name === state.currentUser && o.mon.dish);
        
        if (userOrder) {
            const message = isEarlyWeek ? t('ordered_this_week') : t('ordered_next_week');
            mainContent.innerHTML = createOrderedSummaryHTML(userOrder, message);
        } else {
            const message = isEarlyWeek ? t('not_ordered_yet_this_week') : t('not_ordered_yet_next_week');
            renderOrderForm(targetWeekString, targetWeekData?.menu, message);
        }
    }

    function createOrderedSummaryHTML(order, message) {
        return `<div class="card glass"><h2>${message}</h2><ul class="ordered-summary">
            <li><strong>Thứ 2:</strong> <span>${parseDish(order.mon.dish)}</span></li>
            <li><strong>Thứ 3:</strong> <span>${parseDish(order.tue.dish)}</span></li>
            <li><strong>Thứ 4:</strong> <span>${parseDish(order.wed.dish)}</span></li>
            <li><strong>Thứ 5:</strong> <span>${parseDish(order.thu.dish)}</span></li>
            <li><strong>Thứ 6:</strong> <span>${parseDish(order.fri.dish)}</span></li>
        </ul></div>`;
    }

    function renderOrderForm(targetWeekString, menu, message) {
        const weekNumber = targetWeekString.split('-W')[1];
        let content = `<div class="card glass"><h2>${message}</h2><h3>${t('order_for_week')} ${weekNumber}</h3>`;
        if (!menu) { content += `<p>${t('no_menu_yet')}</p></div>`; mainContent.innerHTML = content; return; }
        
        const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
        content += `<div class="day-tabs">${days.map((day, i) => `<button class="day-tab ${i === 0 ? 'active' : ''}" data-day="${day}">${day}</button>`).join('')}</div>`;
        content += `<div id="order-form-content"></div><div id="order-summary" class="hidden"></div></div>`;
        
        mainContent.innerHTML = content;
        
        document.querySelectorAll('.day-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelector('.day-tab.active').classList.remove('active');
                tab.classList.add('active');
                renderOrderDay(tab.dataset.day, menu);
            });
        });
        
        renderOrderDay(days[0], menu);
    }
    
    function renderOrderDay(day, menu) {
        const orderFormContent = document.getElementById('order-form-content');
        if (!orderFormContent) return;

        const dayKeyMap = { "Thứ 2": "mon", "Thứ 3": "tue", "Thứ 4": "wed", "Thứ 5": "thu", "Thứ 6": "fri" };
        const dayKey = dayKeyMap[day];
        let dayHTML = `<div class="dish-options">`;
        if (menu[day]) {
            menu[day].forEach((dish) => {
                if (dish) dayHTML += `<div class="dish-option ${state.orderSelection[dayKey] === dish ? 'selected' : ''}" data-dish="${dish}" data-day-key="${dayKey}">${parseDish(dish)}</div>`;
            });
        }
        orderFormContent.innerHTML = dayHTML + `</div>`;
    }
    
    function renderOrderSummary() {
        document.getElementById('order-form-content').classList.add('hidden');
        document.querySelector('.day-tabs').classList.add('hidden');
        const summaryView = document.getElementById('order-summary');
        summaryView.innerHTML = `<h3>${t('confirm_order')}</h3><ul>
            <li><strong>Thứ 2:</strong> <span>${parseDish(state.orderSelection.mon) || ''}</span></li>
            <li><strong>Thứ 3:</strong> <span>${parseDish(state.orderSelection.tue) || ''}</span></li>
            <li><strong>Thứ 4:</strong> <span>${parseDish(state.orderSelection.wed) || ''}</span></li>
            <li><strong>Thứ 5:</strong> <span>${parseDish(state.orderSelection.fri) || ''}</span></li>
        </ul><button id="submit-order-btn" class="btn-primary">${t('submit_order_week')}</button>`;
        summaryView.classList.remove('hidden');
    }

    // --- Event Listeners ---
    mainContent.addEventListener('click', async (e) => {
        if (e.target.id === 'eat-button') {
            if (!navigator.onLine) { alert(t('offline_error')); return; }
            
            const button = e.target;
            button.disabled = true;
            button.innerText = t('eaten');
            
            const userOrder = state.thisWeekData.orders.find(o => o.name === state.currentUser);
            if (userOrder) {
                let today = new Date().getDay();
                if (today === 6 || today === 0) today = 5;
                const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][today];
                userOrder[dayKey].eaten = 'đã ăn';
                cache.set(`data_getWeekData_${state.thisWeekString}`, state.thisWeekData);
            }

            fetchData({ action: 'markAsEaten', name: state.currentUser, week: state.thisWeekString })
                .catch(err => console.error("Sync failed:", err));
        }

        if (e.target.classList.contains('eaten-checkbox-input')) {
            if (!navigator.onLine) { 
                alert(t('offline_error')); 
                e.target.checked = !e.target.checked;
                return; 
            }
            const name = e.target.dataset.name;
            const isChecked = e.target.checked;
            e.target.closest('.staff-item').classList.toggle('eaten', isChecked);

            fetchData({ action: 'toggleEaten', name: name, week: state.thisWeekString })
               .catch(err => console.error("Sync failed:", err));
        }
        
        if (e.target.classList.contains('dish-option')) {
            const dayKey = e.target.dataset.dayKey;
            const dish = e.target.dataset.dish;

            state.orderSelection[dayKey] = dish;
            const currentOptions = e.target.parentElement.querySelectorAll('.dish-option');
            currentOptions.forEach(opt => opt.classList.remove('selected'));
            e.target.classList.add('selected');

            const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
            const dayKeyMap = { mon: "Thứ 2", tue: "Thứ 3", wed: "Thứ 4", thu: "Thứ 5", fri: "Thứ 6" };
            const currentDayIndex = days.indexOf(dayKeyMap[dayKey]);

            if (currentDayIndex < days.length - 1) {
                const nextDay = days[currentDayIndex + 1];
                document.querySelector(`.day-tab[data-day="${nextDay}"]`).click();
            } else {
                renderOrderSummary();
            }
        }
        
        if (e.target.id === 'submit-order-btn') {
            const isEarlyWeek = new Date().getDay() <= 3;
            const targetWeek = isEarlyWeek ? state.thisWeekString : state.nextWeekString;
            
            const result = await fetchData({ 
                action: 'placeOrder', 
                name: state.currentUser, 
                week: targetWeek, 
                order: JSON.stringify(state.orderSelection) 
            });

            if (result) {
                alert(result.message);
                state.orderSelection = { mon: null, tue: null, wed: null, thu: null, fri: null };
                localStorage.removeItem(`data_getWeekData_${targetWeek}`);
                
                document.querySelector('.tab-link.active').classList.remove('active');
                const todayTab = document.querySelector('[data-tab="today"]');
                todayTab.classList.add('active');
                state.currentTab = 'today';
                await render();
            }
        }
    });

    tabBar.addEventListener('click', async (e) => {
        if (e.target.classList.contains('tab-link')) {
            const tab = e.target.dataset.tab;
            if (tab === state.currentTab) return;
            document.querySelector('.tab-link.active').classList.remove('active');
            e.target.classList.add('active');
            state.currentTab = tab;
            await render();
        }
    });

    // --- Settings Modal Logic ---
    function populateSettings() {
        if (!state.currentUser) return;
        const user = state.staff.find(s => s.name === state.currentUser);
        if (!user) return;
        
        document.getElementById('department-input').value = user.department || '';
        
        const shiftRadio = document.querySelector(`input[name="shift-type"][value="${user.shift}"]`);
        if (shiftRadio) shiftRadio.checked = true;

        // SỬA LỖI: Chuyển đổi ngôn ngữ từ sheet sang chữ thường
        state.language = (user.language || 'vi').toLowerCase();
        localStorage.setItem('language', state.language);
        updateUIlanguage();
    }
    
    settingsBtn.onclick = () => settingsModal.classList.remove('hidden');
    document.querySelectorAll('.close-button').forEach(btn => btn.onclick = () => {
        settingsModal.classList.add('hidden');
        addStaffModal.classList.add('hidden');
    });
    
    document.getElementById('user-select').addEventListener('change', (e) => {
        state.currentUser = e.target.value;
        localStorage.setItem('currentUser', state.currentUser);
        populateSettings();
        render();
    });
    
    document.getElementById('add-staff-button').onclick = () => addStaffModal.classList.remove('hidden');

    document.getElementById('save-settings-btn').addEventListener('click', async () => {
        if (!state.currentUser) return;
        const newDept = document.getElementById('department-input').value.trim();
        const newShift = document.querySelector('input[name="shift-type"]:checked').value;
        const newLang = document.querySelector('.lang-btn.active').dataset.lang;

        await Promise.all([
             fetchData({ action: 'updateDepartment', name: state.currentUser, department: newDept }),
             fetchData({ action: 'updateShift', name: state.currentUser, shiftType: newShift }),
             fetchData({ action: 'updateLanguage', name: state.currentUser, language: newLang })
        ]);
        
        alert(t('action_successful'));
        settingsModal.classList.add('hidden');
        await init(true);
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
             document.querySelector('.lang-btn.active').classList.remove('active');
             btn.classList.add('active');
             state.language = btn.dataset.lang;
        });
    });
    
    document.getElementById('submit-new-staff').onclick = async () => {
        const name = document.getElementById('new-staff-name').value.trim();
        const email = document.getElementById('new-staff-email').value.trim();
        const department = document.getElementById('new-staff-department').value.trim();
        if (!name || !email || !department) { alert('Vui lòng nhập đủ thông tin.'); return; }
        
        const result = await fetchData({ action: 'addStaff', name, email, department });
        if (result) {
            alert(result.message);
            addStaffModal.classList.add('hidden');
            await init(true);
        }
    };
    
    async function init(forceRefresh = false) {
        const today = new Date();
        state.thisWeekString = getWeekString(today);
        state.nextWeekString = getWeekString(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));
        
        const staffCacheKey = 'staff_data';
        let staffData = cache.get(staffCacheKey);
        if (!staffData || forceRefresh) {
            staffData = await fetchData({ action: 'getStaff' });
            if (!staffData) { // CẢI TIẾN: Nếu không fetch được staff data thì dừng lại
                 mainContent.innerHTML = `<div class="card glass"><p>${t('fetch_error')}</p></div>`;
                 return;
            }
            cache.set(staffCacheKey, staffData);
        }
        
        state.staff = staffData || [];
        
        const userSelect = document.getElementById('user-select');
        userSelect.innerHTML = `<option value="">-- ${t('select_name')} --</option>${state.staff.map(s => `<option value="${s.name}" ${state.currentUser === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}`;
        
        if(state.currentUser) {
           populateSettings();
        }

        await render();
        checkUserInfo();
    }

    init();
});
