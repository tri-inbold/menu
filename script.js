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
        language: localStorage.getItem('language') || 'vi',
        currentTab: 'today',
        menuFilterMode: 'auto',
        staff: [], thisWeekData: null, nextWeekData: null,
        thisWeekString: '', nextWeekString: '',
        orderSelection: { mon: null, tue: null, wed: null, thu: null, fri: null }
    };

    const translations = {
        vi: {
            settings: 'Cài đặt', select_name: 'Chọn tên', shift_type: 'Loại ca',
            office_hours: 'Hành chính', rotating_shift: 'Đảo ca', evening_shift_only: 'Ca tối',
            language: 'Ngôn ngữ', add_member: 'Thêm thành viên', add_new_member: 'Thành viên mới', add: 'Thêm',
            menu: 'Thực Đơn', today: 'Hôm Nay', order: 'Đặt Món',
            ordered_this_week: 'Bạn đã đặt món cho tuần này', ordered_next_week: 'Bạn đã đặt món cho tuần sau',
            not_ordered_yet_this_week: 'Bạn chưa đặt món cho tuần này', not_ordered_yet_next_week: 'Bạn chưa đặt món cho tuần sau',
            order_for_week: 'Đặt món cho Tuần', confirm_eaten: 'Xác nhận đã ăn',
            not_ordered_today: 'Bạn chưa đặt món cho hôm nay.', no_menu_today: 'Hôm nay không phục vụ bữa ăn.',
            search_placeholder: 'Tìm kiếm nhân viên...', morning_shift: 'Ca Sáng', evening_shift: 'Ca Chiều',
            no_menu_yet: 'Thực đơn chưa được cập nhật.', confirm_order: 'Xác nhận đơn hàng', submit_order_week: 'Hoàn tất đặt món',
        },
        en: {
            settings: 'Settings', select_name: 'Select name', shift_type: 'Shift Type',
            office_hours: 'Office', rotating_shift: 'Rotating', evening_shift_only: 'Evening',
            language: 'Language', add_member: 'Add Member', add_new_member: 'New Member', add: 'Add',
            menu: 'Menu', today: 'Today', order: 'Order',
            ordered_this_week: 'You have ordered for this week', ordered_next_week: 'You have ordered for next week',
            not_ordered_yet_this_week: 'You have not ordered for this week', not_ordered_yet_next_week: 'You have not ordered for next week',
            order_for_week: 'Order for Week', confirm_eaten: 'Confirm Eaten',
            not_ordered_today: 'You have not ordered for today.', no_menu_today: 'No meal served today.',
            search_placeholder: 'Search for staff...', morning_shift: 'Morning Shift', evening_shift: 'Evening Shift',
            no_menu_yet: 'Menu is not updated yet.', confirm_order: 'Confirm Order', submit_order_week: 'Complete Order',
        }
    };
    
    // --- Helper Functions ---
    const t = (key) => translations[state.language][key] || key;
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
        document.querySelectorAll('[data-lang-key]').forEach(el => el.innerText = t(el.dataset.langKey));
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
            const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri'][new Date().getDay()];
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

    function renderMenu() {
        mainContent.innerHTML = `
            <div class="search-bar-container">
                <input type="text" id="search-staff" placeholder="${t('search_placeholder')}">
                <button id="menu-filter-btn" class="icon-btn"></button>
            </div>
            <div id="staff-list-container"></div>`;
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
        const dayKey = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri'][new Date().getDay()];
        const filteredOrders = state.thisWeekData?.orders.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];
        let showSang = true, showChieu = true;
        if (state.menuFilterMode === 'auto') {
            filterBtn.innerHTML = `<i class="fas ${hour < 15 ? 'fa-sun' : 'fa-moon'}"></i>`;
            if (hour < 15) showChieu = false; else showSang = false;
        } else { filterBtn.innerHTML = `<i class="fas fa-smile"></i>`; }
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
        if (showSang) html += `<div class="shift-group"><h3>${t('morning_shift')}</h3><ul class="staff-list">${createList(sangOrders)}</ul></div>`;
        if (showChieu) html += `<div class="shift-group"><h3>${t('evening_shift')}</h3><ul class="staff-list">${createList(chieuOrders)}</ul></div>`;
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
        if (!menu) { content += `<p>${t('no_menu_yet')}</p></div>`; mainContent.innerHTML = content; return; }
        const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
        content += `<div class="day-tabs">${days.map((day, i) => `<button class="day-tab ${i === 0 ? 'active' : ''}" data-day="${day}">${day}</button>`).join('')}</div>`;
        content += `<div id="order-form-content"></div><div id="order-summary" class="hidden"></div>`;
        mainContent.innerHTML = content;
        renderOrderDay(days[0], menu);
    }

    function renderOrderDay(day, menu) {
        const orderFormContent = document.getElementById('order-form-content');
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
            <li><strong>Thứ 2:</strong> <span>${parseDish(state.orderSelection.mon) || ''}</span></li><li><strong>Thứ 3:</strong> <span>${parseDish(state.orderSelection.tue) || ''}</span></li>
            <li><strong>Thứ 4:</strong> <span>${parseDish(state.orderSelection.wed) || ''}</span></li><li><strong>Thứ 5:</strong> <span>${parseDish(state.orderSelection.thu) || ''}</span></li>
            <li><strong>Thứ 6:</strong> <span>${parseDish(state.orderSelection.fri) || ''}</span></li>
        </ul><button id="submit-order-btn" class="btn-primary">${t('submit_order_week')}</button>`;
        summaryView.classList.remove('hidden');
    }

    mainContent.addEventListener('click', async (e) => {
        if (e.target.id === 'eat-button') {
            const result = await fetchData({ action: 'markAsEaten', name: state.currentUser, week: state.thisWeekString });
            if (result) {
                state.thisWeekData = await fetchData({ action: 'getWeekData', week: state.thisWeekString });
                render();
            }
        }
        if (e.target.classList.contains('eaten-checkbox-input')) {
            await fetchData({ action: 'markAsEaten', name: e.target.dataset.name, week: state.thisWeekString });
            state.thisWeekData = await fetchData({ action: 'getWeekData', week: state.thisWeekString });
            updateStaffListView(document.getElementById('search-staff')?.value || '');
        }
        if (e.target.classList.contains('dish-option')) {
            const dayKey = e.target.dataset.dayKey;
            state.orderSelection[dayKey] = e.target.dataset.dish;
            const days = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
            const dayKeyMap = { mon: "Thứ 2", tue: "Thứ 3", wed: "Thứ 4", thu: "Thứ 5", fri: "Thứ 6" };
            const currentDayIndex = days.indexOf(dayKeyMap[dayKey]);
            if (currentDayIndex < days.length - 1) {
                const nextDay = days[currentDayIndex + 1];
                document.querySelector('.day-tab.active').classList.remove('active');
                document.querySelector(`.day-tab[data-day="${nextDay}"]`).classList.add('active');
                const isEarlyWeek = new Date().getDay() <= 3;
                renderOrderDay(nextDay, isEarlyWeek ? state.thisWeekData.menu : state.nextWeekData.menu);
            } else { renderOrderSummary(); }
        }
        if (e.target.id === 'submit-order-btn') {
            const isEarlyWeek = new Date().getDay() <= 3;
            const targetWeek = isEarlyWeek ? state.thisWeekString : state.nextWeekString;
            const result = await fetchData({ action: 'placeOrder', name: state.currentUser, week: targetWeek, order: JSON.stringify(state.orderSelection) });
            if (result) {
                alert(result.message);
                state.orderSelection = { mon: null, tue: null, wed: null, thu: null, fri: null };
                if (isEarlyWeek) state.thisWeekData = await fetchData({ action: 'getWeekData', week: state.thisWeekString });
                else state.nextWeekData = await fetchData({ action: 'getWeekData', week: state.nextWeekString });
                state.currentTab = 'today';
                document.querySelector('.tab-link.active').classList.remove('active');
                document.querySelector('[data-tab="today"]').classList.add('active');
                render();
            }
        }
    });

    tabBar.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-link')) {
            const tab = e.target.dataset.tab;
            if (tab === state.currentTab) return;
            document.querySelector('.tab-link.active').classList.remove('active');
            e.target.classList.add('active');
            state.currentTab = tab;
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
            const currentUserInfo = state.staff.find(s => s.name === state.currentUser);
            if (currentUserInfo) {
                const shiftRadio = document.querySelector(`input[name="shift-type"][value="${currentUserInfo.shift}"]`);
                if (shiftRadio) shiftRadio.checked = true;
            }
            render();
        }
        if (e.target.name === 'shift-type') {
            const newShiftType = e.target.value;
            await fetchData({ action: 'updateShift', name: state.currentUser, shiftType: newShiftType });
            const user = state.staff.find(s => s.name === state.currentUser);
            if (user) user.shift = newShiftType;
        }
    });

    document.querySelector('#settings-modal .modal-content').addEventListener('click', (e) => {
        if (e.target.classList.contains('lang-btn')) {
            state.language = e.target.dataset.lang;
            localStorage.setItem('language', state.language);
            render();
        }
    });

    document.getElementById('submit-new-staff').onclick = async () => {
        const name = document.getElementById('new-staff-name').value.trim();
        const email = document.getElementById('new-staff-email').value.trim();
        const department = document.getElementById('new-staff-department').value.trim();
        if (!name || !email || !department) { alert('Vui lòng nhập đủ thông tin.'); return; }
        const result = await fetchData({ action: 'addStaff', name, email, department });
        if (result) {
            addStaffModal.classList.add('hidden');
            state.staff = await fetchData({ action: 'getStaff' });
            document.getElementById('user-select').innerHTML = `<option value="">-- ${t('select_name')} --</option>${state.staff.map(s => `<option value="${s.name}" ${state.currentUser === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}`;
        }
    };
    
    async function init() {
        const today = new Date();
        state.thisWeekString = getWeekString(today);
        state.nextWeekString = getWeekString(new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000));
        const [staffData, thisWeekData, nextWeekData] = await Promise.all([
            fetchData({ action: 'getStaff' }),
            fetchData({ action: 'getWeekData', week: state.thisWeekString }),
            fetchData({ action: 'getWeekData', week: state.nextWeekString })
        ]);
        state.staff = staffData || [];
        state.thisWeekData = thisWeekData;
        state.nextWeekData = nextWeekData;
        const userSelect = document.getElementById('user-select');
        userSelect.innerHTML = `<option value="">-- ${t('select_name')} --</option>${state.staff.map(s => `<option value="${s.name}" ${state.currentUser === s.name ? 'selected' : ''}>${s.name}</option>`).join('')}`;
        const currentUserInfo = state.staff.find(s => s.name === state.currentUser);
        if (currentUserInfo) {
            const shiftRadio = document.querySelector(`input[name="shift-type"][value="${currentUserInfo.shift}"]`);
            if (shiftRadio) shiftRadio.checked = true;
        }
        render();
    }
    init();
});