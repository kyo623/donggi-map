document.addEventListener('DOMContentLoaded', () => {
    // Auth Overlay Logic
    const authOverlay = document.getElementById('auth-overlay');
    const nicknameInput = document.getElementById('nickname-input');
    const authBtn = document.getElementById('auth-btn');

    const allowedNicknames = ["1004", "222", "amy", "dang", "ellia", "hae", "ian", "kuchipatchi", "nemo", "nonew", "noun", "sin", "tomo", "yoonin", "alice", "bulkyboy", "bo", "dan", "gregory", "kyo", "malangko", "momlove", "oyajitchi", "soori", "wal7676", "yongari", "zero", "i1i11i"];

    nicknameInput.focus();

    const handleAuth = () => {
        const val = nicknameInput.value.trim().toLowerCase();
        if (allowedNicknames.includes(val)) {
            localStorage.setItem('current_nickname', val); // 별명 저장
            authOverlay.classList.add('hidden');
            setTimeout(() => {
                authOverlay.style.display = 'none';
                initApp();
            }, 600); // Wait for transition
        } else {
            nicknameInput.classList.remove('shake');
            void nicknameInput.offsetWidth; // Trigger reflow to restart animation
            nicknameInput.classList.add('shake');
            nicknameInput.placeholder = "인증 실패";
        }
    };

    authBtn.addEventListener('click', handleAuth);
    nicknameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAuth();
    });

    function initApp() {
        const script = document.createElement('script');
        script.src = "https://dapi.kakao.com/v2/maps/sdk.js?appkey=8392ba435da2c876c6a059606b6a5cf5&libraries=services&autoload=false";
        document.head.appendChild(script);

        script.onload = () => {
            kakao.maps.load(() => {
                initMap();
            });
        };
    }

    function initMap() {
        // 1. Initialize Map
        const mapContainer = document.getElementById('map');
        const KOOKMIN_LAT = 37.6108;
        const KOOKMIN_LON = 126.9973;
        const kookminPos = new kakao.maps.LatLng(KOOKMIN_LAT, KOOKMIN_LON);

        // Apply dark mode filter to Kakao Map container
        mapContainer.style.filter = "invert(100%) hue-rotate(180deg) brightness(85%) contrast(110%) saturate(80%)";

        // Filter to counter-invert the map's CSS filter for popups and markers
        const COUNTER_FILTER = "invert(100%) hue-rotate(180deg) brightness(117%) contrast(90%) saturate(125%)";

        const mapOption = {
            center: kookminPos,
            level: 4
        };

        const map = new kakao.maps.Map(mapContainer, mapOption);

        // Zoom control
        const zoomControl = new kakao.maps.ZoomControl();
        map.addControl(zoomControl, kakao.maps.ControlPosition.TOPRIGHT);

        // 1-1. Landmark Marker for Kookmin Univ
        const landmarkContent = document.createElement('div');
        landmarkContent.style.filter = COUNTER_FILTER;
        landmarkContent.innerHTML = `
            <div style="width: 24px; height: 24px; background: var(--accent-color); border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 20px rgba(255, 94, 0, 0.8), 0 0 40px rgba(255, 94, 0, 0.4); animation: pulse 2s infinite;"></div>
            <div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: var(--panel-bg); color: var(--accent-color); padding: 4px 10px; border-radius: 4px; font-weight: 800; font-size: 14px; white-space: nowrap; border: 1px solid var(--accent-color);">KOOKMIN UNIV.</div>
        `;
        new kakao.maps.CustomOverlay({
            position: kookminPos,
            content: landmarkContent,
            yAnchor: 0.5,
            zIndex: 1
        }).setMap(map);

        // Kakao Places service
        const ps = new kakao.maps.services.Places();

        // UI Elements
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        const searchResults = document.getElementById('search-results');
        const archiveListBody = document.getElementById('archive-list');

        let tempOverlay = null;
        let registeredOverlays = [];

        // 4. Supabase 연동 로직 초기화
        const supabaseUrl = 'https://anndwvshzlljczcvasba.supabase.co';
        const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFubmR3dnNoemxsamN6Y3Zhc2JhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzczODQsImV4cCI6MjA4OTI1MzM4NH0.Y4GxhhqHAXitWwsvSbz6s88g_6v_zD8SkDBcEWmNYGM';
        const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

        window.globalArchiveData = []; // 메모리 캐싱용
        const globalGeocoder = new kakao.maps.services.Geocoder();

        function getAddressFromCoords(lat, lon) {
            return new Promise(resolve => {
                globalGeocoder.coord2Address(lon, lat, (result, status) => {
                    if (status === kakao.maps.services.Status.OK && result.length > 0) {
                        const addr = result[0].road_address ? result[0].road_address.address_name : result[0].address.address_name;
                        resolve(addr);
                    } else {
                        resolve("주소 정보 없음");
                    }
                });
            });
        }

        loadArchive();

        // 2. Search Logic
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });

        function performSearch() {
            const query = searchInput.value.trim();
            if (!query) {
                searchResults.innerHTML = '';
                return;
            }

            searchResults.innerHTML = '<li style="text-align:center; color:var(--text-muted); padding: 24px; cursor: default;">검색 중...</li>';

            // Set search options: location (Kookmin Univ) and sort by distance
            const searchOptions = {
                location: kookminPos,
                sort: kakao.maps.services.SortBy.DISTANCE
            };

            ps.keywordSearch(query, placesSearchCB, searchOptions);
        }

        function placesSearchCB(data, status, pagination) {
            searchResults.innerHTML = '';

            if (status === kakao.maps.services.Status.ZERO_RESULT || data.length === 0) {
                searchResults.innerHTML = '<li style="text-align:center; color:var(--text-muted); padding: 24px; cursor: default;">검색 결과가 없습니다.</li>';
                return;
            }

            if (status === kakao.maps.services.Status.ERROR) {
                searchResults.innerHTML = '<li style="text-align:center; color:#ff4444; padding: 24px; cursor: default;">시스템 오류</li>';
                return;
            }

            // Limit to top 5 results
            data.slice(0, 5).forEach(place => {
                const li = document.createElement('li');
                const distanceStr = (place.distance / 1000).toFixed(1); // distance in km
                let categoryText = place.category_name || '';
                if (categoryText.includes('>')) categoryText = categoryText.split('>').pop().trim();

                const pName = place.place_name || '?';
                const isCafe = place.category_name && place.category_name.includes('카페');
                const iconSvg = isCafe ? '<path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line>' : '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>';
                const graphicPlaceholder = `<div style="width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, ${isCafe ? '#2A2A3A, #1A1A2A' : '#3A2A1A, #2A1A0A'}); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.05); box-shadow: inset 0 2px 8px rgba(255,255,255,0.05);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${isCafe ? '#5856D6' : '#FF5F00'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg></div>`;

                li.innerHTML = `
                    <div style="display:flex; gap: 16px; align-items:center;">
                        ${graphicPlaceholder}
                        <div style="flex:1;">
                            <strong>${place.place_name} <span style="font-size:12px; color:var(--accent-color); font-weight:normal; margin-left: 6px;">(${distanceStr}km)</span></strong>
                            <span>${place.road_address_name || place.address_name}</span>
                        </div>
                    </div>
                `;

                li.addEventListener('click', () => {
                    const moveLatLon = new kakao.maps.LatLng(place.y, place.x);
                    map.panTo(moveLatLon);
                    showPlacePopup(place, moveLatLon);
                });
                searchResults.appendChild(li);
            });
        }

        const snowboardCard = document.getElementById('snowboard-card');

        function showPlacePopup(place, latlng, isCustom = false) {
            highlightSidebarItem(null);
            snowboardCard.classList.remove('hidden');

            let categoryText = place.category_name || '';
            if (categoryText.includes('>')) categoryText = categoryText.split('>').pop().trim();

            snowboardCard.innerHTML = `
                <div class="sc-close" id="sc-close-btn"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>
                <div class="sc-title" style="font-size: 20px; margin-bottom:4px;">${place.place_name}</div>
                <div class="sc-address" style="margin-bottom: 16px;">${categoryText} | ${place.road_address_name || place.address_name}</div>
                
                <button class="glow-btn" id="recommend-btn" style="width: 100%; border:none; padding:12px; border-radius:12px; background: rgba(255,255,255,0.05); color:#fff; font-weight:700; cursor:pointer; margin-bottom: 8px;">장소 등록하기</button>
                
                <div id="recommend-form" style="display: none; margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px; text-align: left;">
                    <div style="display: flex; background: rgba(255,255,255,0.05); border-radius: 12px; margin-bottom: 12px; padding: 4px;" id="cat-toggle-group">
                        <button type="button" class="cat-btn active" data-val="식당" style="flex:1; padding: 10px; border:none; background:rgba(255,255,255,0.1); color:#fff; cursor:pointer; font-weight:700; font-size:13px; border-radius:10px; transition:0.2s;">식당</button>
                        <button type="button" class="cat-btn" data-val="카페" style="flex:1; padding: 10px; border:none; background:transparent; color:var(--text-muted); cursor:pointer; font-weight:700; font-size:13px; border-radius:10px; transition:0.2s;">카페</button>
                    </div>
                    <input type="hidden" id="place-category" value="식당">
                    <div style="margin-bottom: 8px;">
                        <input type="text" id="tag-input" placeholder="해시태그 (선택, 예: 가성비)" autocomplete="off" style="width:100%; padding: 12px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); color:#fff; border-radius: 12px; outline:none; box-sizing: border-box; font-size: 13px;">
                    </div>
                    ${isCustom ? `<input type="text" id="custom-name-input" placeholder="장소명 입력" autocomplete="off" style="width:100%; padding: 12px; margin-bottom: 8px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); color:#fff; border-radius:12px; box-sizing: border-box; font-size: 13px;">` : ''}
                    <div style="margin-bottom: 8px;">
                        <input type="text" id="menu-input" placeholder="추천 메뉴 (선택)" autocomplete="off" style="width:100%; padding: 12px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); color:#fff; border-radius: 12px; outline:none; box-sizing: border-box; font-size: 13px;">
                    </div>
                    <div style="margin-bottom: 12px;">
                        <input type="text" id="comment-input" placeholder="이 장소에 대한 추천/간단 메모..." autocomplete="off" style="width:100%; padding: 12px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); color:#fff; border-radius: 12px; outline:none; box-sizing: border-box; font-size: 13px;">
                    </div>
                    <div id="reg-star-rating" style="display: flex; gap: 4px; margin-bottom: 16px; justify-content: center;">
                        <span class="reg-star" data-idx="1" style="font-size: 28px; color: #444; cursor: pointer; transition: 0.2s;">★</span>
                        <span class="reg-star" data-idx="2" style="font-size: 28px; color: #444; cursor: pointer; transition: 0.2s;">★</span>
                        <span class="reg-star" data-idx="3" style="font-size: 28px; color: #444; cursor: pointer; transition: 0.2s;">★</span>
                        <span class="reg-star" data-idx="4" style="font-size: 28px; color: #444; cursor: pointer; transition: 0.2s;">★</span>
                        <span class="reg-star" data-idx="5" style="font-size: 28px; color: #444; cursor: pointer; transition: 0.2s;">★</span>
                    </div>
                    <button class="glow-btn" id="final-reg-btn" style="background: linear-gradient(135deg, var(--accent-color), var(--accent-hover)); width: 100%; border:none; padding:12px; border-radius: 12px; color:#fff; font-weight:700; cursor:pointer;">등록 확정</button>
                </div>
            `;

            const catBtns = snowboardCard.querySelectorAll('.cat-btn');
            catBtns.forEach(btn => {
                btn.onclick = (e) => {
                    catBtns.forEach(b => {
                        b.style.background = 'transparent';
                        b.style.color = 'var(--text-muted)';
                        b.classList.remove('active');
                    });
                    e.target.style.background = 'rgba(255,255,255,0.1)';
                    e.target.style.color = '#fff';
                    e.target.classList.add('active');
                    snowboardCard.querySelector('#place-category').value = e.target.getAttribute('data-val');
                };
            });

            snowboardCard.querySelector('#sc-close-btn').onclick = () => {
                snowboardCard.classList.add('hidden');
            };

            snowboardCard.querySelector('#recommend-btn').onclick = (e) => {
                e.target.style.display = 'none';
                snowboardCard.querySelector('#recommend-form').style.display = 'block';
                if (isCustom) {
                    setTimeout(() => snowboardCard.querySelector('#custom-name-input').focus(), 100);
                } else {
                    setTimeout(() => snowboardCard.querySelector('#tag-input').focus(), 100);
                }
            };

            let selectedRegRating = 0;
            const regStars = snowboardCard.querySelectorAll('.reg-star');
            regStars.forEach(star => {
                star.onclick = () => {
                    selectedRegRating = parseInt(star.getAttribute('data-idx'));
                    regStars.forEach((s, idx) => {
                        s.style.color = idx < selectedRegRating ? 'var(--accent-color)' : '#444';
                    });
                };
            });

            snowboardCard.querySelector('#final-reg-btn').onclick = () => {
                const category = snowboardCard.querySelector('#place-category').value;
                const tag = snowboardCard.querySelector('#tag-input').value.trim() || category;
                const menu = snowboardCard.querySelector('#menu-input').value.trim();
                const comment = snowboardCard.querySelector('#comment-input').value.trim();
                const finalName = isCustom ? (snowboardCard.querySelector('#custom-name-input').value.trim() || place.place_name) : place.place_name;

                if (isCustom && finalName === '직접 지정 위치') {
                    alert('장소명을 입력해주세요.');
                    return;
                }

                const address = place.road_address_name || place.address_name;
                const lat = place.y || latlng.getLat();
                const lon = place.x || latlng.getLng();
                const author = localStorage.getItem('current_nickname') || '익명';

                snowboardCard.classList.add('hidden');
                registerPlace(finalName, lat, lon, address, tag, menu, comment, author, category, selectedRegRating);
            };
        }

        // 3. Coordinate based Place Search (Click Map)
        kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
            if (window._ignoreMapClick) return;
            highlightSidebarItem(null);
            if (typeof snowboardCard !== 'undefined') snowboardCard.classList.add('hidden');
            const latlng = mouseEvent.latLng;

            // Search nearby Food places (FD6) first
            ps.categorySearch('FD6', (data, status) => {
                if (status === kakao.maps.services.Status.OK && data.length > 0) {
                    showPlacePopup(data[0], latlng);
                } else {
                    // Try Cafe (CE7) next
                    ps.categorySearch('CE7', (data2, status2) => {
                        if (status2 === kakao.maps.services.Status.OK && data2.length > 0) {
                            showPlacePopup(data2[0], latlng);
                        } else {
                            // If no place found, fallback to geocoder for address
                            const geocoder = new kakao.maps.services.Geocoder();
                            geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (addrData, addrStatus) => {
                                let address = "Unmapped Area";
                                if (addrStatus === kakao.maps.services.Status.OK && addrData.length > 0) {
                                    address = addrData[0].road_address ? addrData[0].road_address.address_name : addrData[0].address.address_name;
                                }
                                showPlacePopup({
                                    place_name: '직접 지정 위치',
                                    road_address_name: address,
                                    address_name: address,
                                    y: latlng.getLat(),
                                    x: latlng.getLng(),
                                    category_name: '사용자 지정'
                                }, latlng, true);
                            });
                        }
                    }, { location: latlng, radius: 20, sort: kakao.maps.services.SortBy.DISTANCE });
                }
            }, { location: latlng, radius: 20, sort: kakao.maps.services.SortBy.DISTANCE });
        });

        async function registerPlace(name, lat, lon, address, tag, menu, comment, author, category, rating) {
            const newPlaceData = {
                nickname: author || '익명',
                place_name: name,
                address: address || '',
                tag: tag || category || '식당',
                menu: menu || '',
                review: comment || '',
                lat: lat,
                lng: lon,
                category: category || '식당',
                rating: rating || 0
            };

            const { data, error } = await supabase
                .from('places')
                .insert([newPlaceData]);

            if (error) {
                console.error('Supabase Error Details:', error);
                alert('데이터베이스 저장 중 에러가 발생했습니다:\n' + (error.message || '알 수 없는 오류'));
                return;
            }

            // DB에서 실시간 구독을 통해 마커가 그려질 것이므로 
            // 여기서는 팝업창 및 입력창만 리셋합니다.
            if (tempOverlay) {
                tempOverlay.setMap(null);
                tempOverlay = null;
            }

            searchResults.innerHTML = '';
            searchInput.value = '';
        }

        async function loadArchive() {
            try {
                archiveListBody.innerHTML = '<li style="text-align:center; color:var(--text-muted); padding: 32px 0; border:none; background:transparent; cursor:default;">데이터 불러오는 중...</li>';

                const { data, error } = await supabase
                    .from('places')
                    .select('*')
                    .order('created_at', { ascending: true }); // 가장 처음 저장된 것이 맨 앞, 나중에 뒤집음

                if (error) throw error;

                const initialData = data.map(row => ({
                    id: row.id,
                    name: row.place_name,
                    address: row.address || '',
                    lat: row.lat,
                    lon: row.lng,
                    tag: row.tag,
                    menu: row.menu,
                    comment: row.review,
                    author: row.nickname,
                    category: row.category || '식당',
                    rating: row.rating || 0,
                    photo_url: row.photo_url,
                    replies: []
                }));

                window.globalArchiveData = await Promise.all(initialData.map(async p => {
                    if (!p.address || p.address === '주소 정보 없음') {
                        p.address = await getAddressFromCoords(p.lat, p.lon);
                    }
                    return p;
                }));

                renderAllMarkersAndList();

                // 실시간(Realtime) 구독 연결
                supabase.channel('custom-all-channel')
                    .on(
                        'postgres_changes',
                        { event: 'INSERT', schema: 'public', table: 'places' },
                        async (payload) => {
                            const row = payload.new;
                            const newPlace = {
                                id: row.id,
                                name: row.place_name,
                                address: row.address || '',
                                lat: row.lat,
                                lon: row.lng,
                                tag: row.tag,
                                menu: row.menu,
                                comment: row.review,
                                author: row.nickname,
                                category: row.category || '식당',
                                rating: row.rating || 0,
                                photo_url: row.photo_url,
                                replies: []
                            };
                            if (!newPlace.address || newPlace.address === '주소 정보 없음') {
                                newPlace.address = await getAddressFromCoords(newPlace.lat, newPlace.lon);
                            }
                            window.globalArchiveData.push(newPlace);
                            renderAllMarkersAndList();
                        }
                    )
                    .on(
                        'postgres_changes',
                        { event: 'DELETE', schema: 'public', table: 'places' },
                        (payload) => {
                            const deletedId = payload.old.id;
                            window.globalArchiveData = window.globalArchiveData.filter(p => p.id !== deletedId);
                            // Also need to remove marker from map
                            const removedGroupIndex = registeredOverlays.findIndex(r => r.id === deletedId);
                            if (removedGroupIndex > -1) {
                                registeredOverlays[removedGroupIndex].overlay.setMap(null);
                                registeredOverlays.splice(removedGroupIndex, 1);
                            }
                            // Close popup if the deleted place is currently open
                            if (tempOverlay) {
                                // Assuming tempOverlay is the one that might be deleted. 
                                // Proper check would look into the content, but let's just close all to be safe if a delete happens
                                tempOverlay.setMap(null);
                            }
                            renderAllMarkersAndList();
                        }
                    )
                    .subscribe();

            } catch (err) {
                console.error('Supabase DB 연결 오류:', err);
                archiveListBody.innerHTML = '<li style="text-align:center; color:#ff4444; padding: 32px 0; border:none; background:transparent; cursor:default;">Failed to connect to the database.<br>Please check the console.</li>';
            }
        }

        // (getTagColor removed in favor of category coloring)

        window.currentActivePlaceId = null;

        function highlightSidebarItem(id) {
            window.currentActivePlaceId = id;
            document.querySelectorAll('.archive-list li').forEach(li => li.classList.remove('active'));
            if (id) {
                const targetLi = document.getElementById('archive-item-' + id);
                if (targetLi) {
                    targetLi.classList.add('active');
                    targetLi.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }

        function addArchiveMarker(place) {
            const markerPos = new kakao.maps.LatLng(place.lat, place.lon);
            const isCafe = place.category === '카페';
            const iconSvg = isCafe
                ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>'
                : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path></svg>';
            const pinColor = isCafe ? '#5856D6' : '#FF5F00';
            const shadowColor = isCafe ? 'rgba(88,86,214,0.6)' : 'rgba(255,95,0,0.6)';
            const strongShadow = isCafe ? 'rgba(88,86,214,1)' : 'rgba(255,95,0,1)';

            const markerContent = document.createElement('div');
            markerContent.style.filter = COUNTER_FILTER;
            markerContent.innerHTML = `
                    <div class="custom-marker" style="--pin-color: ${pinColor}; --pin-glow: ${shadowColor}; --pin-glow-strong: ${strongShadow};">
                        <div class="marker-wrapper">
                            <div class="marker-shadow" style="background: ${isCafe ? 'rgba(88,86,214,0.4)' : 'rgba(255,95,0,0.4)'};"></div>
                            <div class="marker-icon-pin">${iconSvg}</div>
                        </div>
                        <div class="marker-label" style="display:none; position:absolute; top:-100px; left:50%; transform:translateX(-50%); background:rgba(20,20,22,0.9); backdrop-filter:blur(10px); color:#fff; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); font-size:12px; white-space:nowrap; box-shadow:0 8px 24px rgba(0,0,0,0.8); z-index:100; pointer-events:none; min-width: 160px;">
                            <div style="background: ${pinColor}; color: #fff; padding: 4px 8px; border-radius: 6px; font-weight: 800; display: inline-block; margin-bottom: 6px; font-size: 10px;">${place.category}</div>
                            <strong style="color:${pinColor}; display:block; font-size:15px; margin-bottom:4px;">${place.name}</strong>
                            <span style="color:var(--text-muted); display:block; margin-bottom: 8px;">${place.address}</span>
                            ${place.menu ? `<div style="margin-bottom: 4px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px; text-align: left;"><strong>추천:</strong> <span style="color: #fff;">${place.menu}</span></div>` : ''}
                            ${place.comment ? `<div style="background: rgba(255,255,255,0.02); padding: 8px; border-radius: 8px; margin-top: 6px; text-align: left;"><em style="color: #ddd;">"${place.comment}"</em><br><div style="color:var(--text-muted); font-size:11px; margin-top: 4px; text-align: right;">- <b>${place.author}</b></div></div>` : ''}
                        </div>
                    </div>
                `;

            const overlay = new kakao.maps.CustomOverlay({
                position: markerPos,
                content: markerContent,
                yAnchor: 1
            });

            markerContent.addEventListener('mouseenter', () => {
                markerContent.querySelector('.marker-label').style.display = 'block';
                markerContent.style.zIndex = "100";
            });
            markerContent.addEventListener('mouseleave', () => {
                markerContent.querySelector('.marker-label').style.display = 'none';
                markerContent.style.zIndex = "";
            });
            markerContent.addEventListener('click', (e) => {
                e.stopPropagation();
                window._ignoreMapClick = true;
                setTimeout(() => { window._ignoreMapClick = false; }, 100);
                const moveLatLon = new kakao.maps.LatLng(place.lat, place.lon);
                map.panTo(moveLatLon);
                showArchivePopup(place, moveLatLon);
            });

            overlay.setMap(map);
            registeredOverlays.push({ id: place.id, overlay });
        }

        function showArchivePopup(place, latlng) {
            highlightSidebarItem(place.id);
            snowboardCard.classList.remove('hidden');

            const replies = place.replies || [];
            let reviewsHtml = '';
            if (place.comment || place.rating) {
                reviewsHtml += `<div style="font-size: 14px; margin-bottom: 12px; color: #f1f1f1; line-height: 1.6; word-break: keep-all;"><strong style="color:var(--accent-color); font-weight: 700; margin-right: 8px;">${place.author}</strong> <span style="color:var(--accent-color); margin-right: 4px;">${place.rating ? '★'.repeat(place.rating) : ''}</span>${place.comment || ''}</div>`;
            }
            replies.forEach(r => {
                reviewsHtml += `<div style="font-size: 14px; margin-bottom: 12px; color: #f1f1f1; line-height: 1.6; word-break: keep-all;"><strong style="color:var(--accent-color); font-weight: 700; margin-right: 8px;">${r.author}</strong> <span style="color:var(--accent-color); margin-right: 4px;">${r.rating ? '★'.repeat(r.rating) : ''}</span>${r.comment || ''}</div>`;
            });
            if (!reviewsHtml) {
                reviewsHtml = `<div style="font-size: 14px; color: var(--text-muted);">아직 등록된 리뷰가 없습니다.</div>`;
            }

            const isCafe = place.category === '카페';
            const iconSvg = isCafe ? '<path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line>' : '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>';
            const fallbackHero = `
                <div style="position: absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(135deg, ${isCafe ? '#1A1A2A, #0D0D14' : '#1F1510, #0D0D0D'}); display: flex; align-items: center; justify-content: center;">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="${isCafe ? 'rgba(88,86,214,0.15)' : 'rgba(255,95,0,0.15)'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>
                </div>`;

            snowboardCard.innerHTML = `
                <div class="sc-close" id="sc-close-btn" style="z-index: 10;"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>
                
                <div style="position: relative; width: 100%; height: 180px; border-radius: 12px; overflow: hidden; margin-bottom: 24px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);">
                    ${fallbackHero}
                    <div style="position: absolute; top:0; left:0; width:100%; height:100%; background: linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.9) 100%); pointer-events: none;"></div>
                    <div style="position: absolute; bottom: 20px; left: 24px; right: 24px; pointer-events: none;">
                        <span class="sc-chip" style="margin-bottom: 8px; padding: 4px 12px; background: rgba(0,0,0,0.4); border-color: rgba(255,255,255,0.2); backdrop-filter: blur(4px); font-size: 12px; border-radius: 12px;">${place.category}</span>
                        <div class="sc-title" style="font-size: 18px; font-weight: 700; color: #fff; line-height: 1.2; margin-bottom: 0; text-shadow: 0 2px 8px rgba(0,0,0,0.8);">${place.name}</div>
                    </div>
                </div>
                
                <div class="sc-address" style="margin-bottom: 24px;">${place.address}</div>
                
                ${place.menu ? `
                    <div class="sc-menu-label">추천 메뉴</div>
                    <div class="sc-menu-val" style="margin-bottom: 24px;">${place.menu}</div>
                ` : ''}
                
                <div class="sc-menu-label" style="color:#888; font-size:13px; font-weight:700; margin-bottom: 8px;">별점 및 동기 리뷰</div>
                <div class="sc-reviews" style="margin-bottom: 16px; max-height: 200px;">
                    ${reviewsHtml}
                </div>
                
                <div style="margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
                    <div id="star-rating" style="display: flex; gap: 4px; margin-bottom: 12px;">
                        <span class="star" data-idx="1" style="font-size: 24px; color: #444; cursor: pointer; transition: 0.2s;">★</span>
                        <span class="star" data-idx="2" style="font-size: 24px; color: #444; cursor: pointer; transition: 0.2s;">★</span>
                        <span class="star" data-idx="3" style="font-size: 24px; color: #444; cursor: pointer; transition: 0.2s;">★</span>
                        <span class="star" data-idx="4" style="font-size: 24px; color: #444; cursor: pointer; transition: 0.2s;">★</span>
                        <span class="star" data-idx="5" style="font-size: 24px; color: #444; cursor: pointer; transition: 0.2s;">★</span>
                    </div>
                    <div class="sc-input-row" style="display: flex; gap: 8px;">
                        <input type="text" id="reply-input" placeholder="한 줄 평 남기기..." autocomplete="off" style="flex:1; padding: 12px 16px; border-radius: 12px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); color: #fff; font-size: 14px; outline: none; transition: 0.2s;">
                        <button class="glow-btn" id="reply-btn" style="background: linear-gradient(135deg, var(--accent-color), var(--accent-hover)); border: none; padding: 0 24px; border-radius: 12px; color: #fff; font-weight: 700; cursor: pointer; font-size: 14px;">등록</button>
                    </div>
                </div>
            `;

            let selectedRating = 0;
            const stars = snowboardCard.querySelectorAll('.star');
            stars.forEach(star => {
                star.onclick = () => {
                    selectedRating = parseInt(star.getAttribute('data-idx'));
                    stars.forEach((s, idx) => {
                        s.style.color = idx < selectedRating ? 'var(--accent-color)' : '#444';
                    });
                };
            });

            snowboardCard.querySelector('#sc-close-btn').onclick = () => {
                snowboardCard.classList.add('hidden');
                highlightSidebarItem(null);
            };

            const inputField = snowboardCard.querySelector('#reply-input');
            inputField.addEventListener('focus', () => inputField.style.borderColor = 'var(--accent-color)');
            inputField.addEventListener('blur', () => inputField.style.borderColor = 'rgba(255,255,255,0.1)');

            snowboardCard.querySelector('#reply-btn').onclick = () => {
                const text = inputField.value.trim();
                if (!text && selectedRating === 0) {
                    alert('별점을 매기거나 리뷰를 남겨주세요.');
                    return;
                }

                const author = localStorage.getItem('current_nickname') || '익명';

                const targetIdx = window.globalArchiveData.findIndex(p => p.id === place.id);
                if (targetIdx > -1) {
                    window.globalArchiveData[targetIdx].replies = window.globalArchiveData[targetIdx].replies || [];
                    window.globalArchiveData[targetIdx].replies.push({
                        author,
                        comment: text,
                        rating: selectedRating,
                        time: Date.now()
                    });

                    showArchivePopup(window.globalArchiveData[targetIdx], latlng);
                }
            };

            snowboardCard.querySelector('#reply-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') snowboardCard.querySelector('#reply-btn').click();
            });

            setTimeout(() => {
                const input = snowboardCard.querySelector('#reply-input');
                if (input) input.focus();
            }, 100);
        }

        let currentContextMenu = null;

        async function deletePlace(id) {
            const { error } = await supabase
                .from('places')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Delete 오류:', error);
                alert('Error deleting data from the archive.');
            }
            // Realtime will handle the UI update
        }

        function showContextMenu(e, place) {
            if (currentContextMenu) {
                currentContextMenu.remove();
            }

            const menu = document.createElement('div');
            menu.className = 'context-menu';
            menu.innerHTML = `<div class="context-menu-item">장소 삭제</div>`;

            // Adjust position to stay within window bounds
            let posX = e.pageX;
            let posY = e.pageY;

            menu.style.left = `${posX}px`;
            menu.style.top = `${posY}px`;

            menu.querySelector('.context-menu-item').addEventListener('click', async () => {
                const confirmDelete = confirm(`'${place.name}' 장소를 삭제할까요?`);
                if (confirmDelete) {
                    await deletePlace(place.id);
                }
                if (menu.parentNode) {
                    menu.remove();
                }
                currentContextMenu = null;
            });

            document.body.appendChild(menu);
            currentContextMenu = menu;

            // Close context menu when clicking outside
            setTimeout(() => {
                document.addEventListener('click', function onClickOutside(evt) {
                    if (currentContextMenu && !currentContextMenu.contains(evt.target)) {
                        currentContextMenu.remove();
                        currentContextMenu = null;
                        document.removeEventListener('click', onClickOutside);
                    }
                });
            }, 0);
        }

        window.currentCategory = 'all';

        function renderAllMarkersAndList() {
            registeredOverlays.forEach(item => item.overlay.setMap(null));
            registeredOverlays = [];

            let filteredList = window.globalArchiveData || [];
            if (window.currentCategory !== 'all') {
                filteredList = filteredList.filter(p => p.category === window.currentCategory);
            }

            filteredList.forEach(place => {
                addArchiveMarker(place);
            });

            updateArchiveList(filteredList);
        }

        const kmuItem = {
            id: 'kmu-static',
            name: '국민대학교',
            address: '서울특별시 성북구 정릉로 77',
            lat: 37.609641,
            lon: 126.997697, // approx KMU
            isPinned: true
        };

        function updateArchiveList(filteredList) {
            archiveListBody.innerHTML = '';

            // Kookmin Univ Pinned Item
            const kmuLi = document.createElement('li');
            kmuLi.style.border = "1px solid rgba(255,255,255,0.1)";
            kmuLi.style.backgroundColor = "rgba(0,0,0,0.5)";
            kmuLi.innerHTML = `
                <strong style="color:var(--text-color);">📌 ${kmuItem.name}</strong>
                <span>${kmuItem.address}</span>
            `;
            kmuLi.addEventListener('click', () => {
                map.panTo(kookminPos);
            });
            archiveListBody.appendChild(kmuLi);

            if (!filteredList || filteredList.length === 0) {
                const emptyLi = document.createElement('li');
                emptyLi.style.textAlign = 'center';
                emptyLi.style.color = 'var(--text-muted)';
                emptyLi.style.padding = '32px 0';
                emptyLi.style.border = 'none';
                emptyLi.style.background = 'transparent';
                emptyLi.style.cursor = 'default';
                emptyLi.innerHTML = '이 카테고리에 등록된 장소가 없습니다.';
                archiveListBody.appendChild(emptyLi);
                return;
            }

            [...filteredList].reverse().forEach(place => {
                const li = document.createElement('li');
                li.id = 'archive-item-' + place.id;

                const pName = place.name || '?';
                const isCafe = place.category === '카페';
                const iconSvg = isCafe ? '<path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line>' : '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"></path>';
                const graphicPlaceholder = `<div style="width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, ${isCafe ? '#2A2A3A, #1A1A2A' : '#3A2A1A, #2A1A0A'}); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.05); box-shadow: inset 0 2px 8px rgba(255,255,255,0.05);"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${isCafe ? '#5856D6' : '#FF5F00'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg></div>`;

                li.innerHTML = `
                    <div style="display:flex; gap: 16px; align-items:center;">
                        ${graphicPlaceholder}
                        <div style="flex:1;">
                            <strong>${place.name}</strong>
                            <span>${place.address}</span>
                        </div>
                    </div>
                `;
                li.addEventListener('click', () => {
                    const moveLatLon = new kakao.maps.LatLng(place.lat, place.lon);
                    map.panTo(moveLatLon);
                    showArchivePopup(place, moveLatLon);
                });

                li.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    showContextMenu(e, place);
                });

                archiveListBody.appendChild(li);
            });
        }

        // Segment control handlers
        document.querySelectorAll('#category-filter .segment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#category-filter .segment-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                window.currentCategory = e.target.getAttribute('data-filter');
                renderAllMarkersAndList();
            });
        });

        // Home button
        document.getElementById('home-kmu-btn').addEventListener('click', () => {
            map.panTo(kookminPos);
        });

    } // end of initMap()
});
