document.addEventListener('DOMContentLoaded', () => {
    // Auth Overlay Logic
    const authOverlay = document.getElementById('auth-overlay');
    const nicknameInput = document.getElementById('nickname-input');
    const authBtn = document.getElementById('auth-btn');

    const allowedNicknames = ["1004", "222", "amy", "dang", "ellia", "hae", "ian", "kuchipachi", "nemo", "nonew", "noun", "sin", "tomo", "yoonin", "alice", "bulkyboy", "bo", "dan", "gregory", "kyo", "malangko", "momlove", "oyajitchi", "soori", "wal7676", "yongari", "zero", "i1i11i"];

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
            nicknameInput.value = ''; // clear input
            nicknameInput.placeholder = "당신의 별명이 아니시네요!";
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
            <div style="position: absolute; top: -30px; left: 50%; transform: translateX(-50%); background: var(--panel-bg); color: var(--accent-color); padding: 4px 10px; border-radius: 4px; font-weight: 800; font-size: 14px; white-space: nowrap; border: 1px solid var(--accent-color);">국민대학교</div>
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

        loadArchive();

        // 2. Search Logic
        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });

        function performSearch() {
            const query = searchInput.value.trim();
            if (!query) return;

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
                searchResults.innerHTML = '<li style="text-align:center; color:#ff4444; padding: 24px; cursor: default;">검색 중 오류가 발생했습니다.</li>';
                return;
            }

            // Limit to top 5 results
            data.slice(0, 5).forEach(place => {
                const li = document.createElement('li');
                const distanceStr = (place.distance / 1000).toFixed(1); // distance in km

                li.innerHTML = `
                        <strong>${place.place_name} <span style="font-size:12px; color:var(--accent-color); font-weight:normal; margin-left: 6px;">(국민대에서 ${distanceStr}km)</span></strong>
                        <span>${place.road_address_name || place.address_name}</span>
                    `;

                li.addEventListener('click', () => {
                    const moveLatLon = new kakao.maps.LatLng(place.y, place.x);
                    map.panTo(moveLatLon);
                    showPlacePopup(place, moveLatLon);
                });
                searchResults.appendChild(li);
            });
        }

        function showPlacePopup(place, latlng, isCustom = false) {
            if (tempOverlay) tempOverlay.setMap(null);

            const contentStr = document.createElement('div');
            contentStr.className = 'kakao-popup';
            contentStr.style.filter = COUNTER_FILTER;
            contentStr.style.minWidth = "240px";

            let categoryText = place.category_name || '';
            if (categoryText.includes('>')) categoryText = categoryText.split('>').pop().trim();

            contentStr.innerHTML = `
                <div class="popup-title">${place.place_name}</div>
                <div style="font-size:12px; color:var(--text-muted); margin-bottom: 12px; word-break: keep-all;">${categoryText} | ${place.road_address_name || place.address_name}</div>
                <button class="register-btn" id="recommend-btn">📍 이 장소 추천하기</button>
                <div class="close-btn" style="position:absolute; top:8px; right:12px; cursor:pointer; font-size:18px; color:var(--text-muted);">&times;</div>
                
                <div id="recommend-form" style="display: none; margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; text-align: left;">
                    <div style="margin-bottom: 8px;">
                        <select id="tag-select" style="width:100%; padding: 8px; background: rgba(0,0,0,0.5); border: 1px solid var(--accent-color); color: #fff; border-radius: 4px; outline:none; font-family: inherit;">
                            <option value="맛집">🍔 #맛집 (놀러가기)</option>
                            <option value="야작">🍕 #야작용 (배달)</option>
                            <option value="카페">☕️ #카페 (감성)</option>
                            <option value="카공">💻 #카공 (집중)</option>
                        </select>
                    </div>
                    ${isCustom ? `<input type="text" id="custom-name-input" placeholder="직접 장소 이름 입력" autocomplete="off" style="width:100%; padding: 8px; margin-bottom: 8px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.3); color:#fff; border-radius:4px; box-sizing: border-box;">` : ''}
                    <div style="margin-bottom: 8px;">
                        <input type="text" id="menu-input" placeholder="추천 메뉴 (예: 연어덮밥)" autocomplete="off" style="width:100%; padding: 8px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.3); color:#fff; border-radius: 4px; outline:none; box-sizing: border-box;">
                    </div>
                    <div style="margin-bottom: 8px;">
                        <input type="text" id="comment-input" placeholder="동기들에게 한마디!" autocomplete="off" style="width:100%; padding: 8px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.3); color:#fff; border-radius: 4px; outline:none; box-sizing: border-box;">
                    </div>
                    <button class="register-btn" id="final-reg-btn" style="background: var(--accent-hover); width: 100%;">💾 맵에 저장하기</button>
                </div>
            `;

            contentStr.querySelector('.close-btn').onclick = () => {
                if (tempOverlay) tempOverlay.setMap(null);
            };

            contentStr.querySelector('#recommend-btn').onclick = (e) => {
                e.target.style.display = 'none'; // hide recommend button
                contentStr.querySelector('#recommend-form').style.display = 'block';
                if (isCustom) {
                    setTimeout(() => contentStr.querySelector('#custom-name-input').focus(), 100);
                } else {
                    setTimeout(() => contentStr.querySelector('#menu-input').focus(), 100);
                }
            };

            contentStr.querySelector('#final-reg-btn').onclick = () => {
                const tag = contentStr.querySelector('#tag-select').value;
                const menu = contentStr.querySelector('#menu-input').value.trim();
                const comment = contentStr.querySelector('#comment-input').value.trim();
                const finalName = isCustom ? (contentStr.querySelector('#custom-name-input').value.trim() || place.place_name) : place.place_name;

                if (isCustom && finalName === '직접 지정 위치') {
                    alert('장소 이름을 입력해주세요!');
                    return;
                }

                const address = place.road_address_name || place.address_name;
                const lat = place.y || latlng.getLat();
                const lon = place.x || latlng.getLng();
                const author = localStorage.getItem('current_nickname') || '익명동기';

                registerPlace(finalName, lat, lon, address, tag, menu, comment, author);
            };

            tempOverlay = new kakao.maps.CustomOverlay({
                position: latlng,
                content: contentStr,
                yAnchor: 1.2,
                zIndex: 10,
                clickable: true
            });
            tempOverlay.setMap(map);
        }

        // 3. Coordinate based Place Search (Click Map)
        kakao.maps.event.addListener(map, 'click', function (mouseEvent) {
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
                                let address = "주소 없는 지역";
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

        async function registerPlace(name, lat, lon, address, tag, menu, comment, author) {
            const newPlaceData = {
                nickname: author || '익명동기',
                place_name: name,
                tag: tag || '맛집',
                menu: menu || '',
                review: comment || '',
                lat: lat,
                lng: lon
            };

            const { data, error } = await supabase
                .from('places')
                .insert([newPlaceData]);

            if (error) {
                console.error('Insert 오류:', error);
                alert('장소를 저장하는 중 오류가 발생했습니다.');
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
                archiveListBody.innerHTML = '<li style="text-align:center; color:var(--text-muted); padding: 32px 0; border:none; background:transparent; cursor:default;">데이터를 불러오는 중입니다...</li>';

                const { data, error } = await supabase
                    .from('places')
                    .select('*')
                    .order('created_at', { ascending: true }); // 가장 처음 저장된 것이 맨 앞, 나중에 뒤집음

                if (error) throw error;

                window.globalArchiveData = data.map(row => ({
                    id: row.id,
                    name: row.place_name,
                    address: '지도 지정 장소', // DB schema lacks address, using a fallback
                    lat: row.lat,
                    lon: row.lng,
                    tag: row.tag,
                    menu: row.menu,
                    comment: row.review,
                    author: row.nickname,
                    replies: [] // 댓글 달기는 in-memory로 임시 유지
                }));

                // 기존 마커 데이터 화면에 뿌리기
                window.globalArchiveData.forEach(place => {
                    addArchiveMarker(place);
                });
                updateArchiveList();

                // 실시간(Realtime) 구독 연결
                supabase.channel('custom-all-channel')
                    .on(
                        'postgres_changes',
                        { event: 'INSERT', schema: 'public', table: 'places' },
                        (payload) => {
                            const row = payload.new;
                            const newPlace = {
                                id: row.id,
                                name: row.place_name,
                                address: '지도 지정 장소',
                                lat: row.lat,
                                lon: row.lng,
                                tag: row.tag,
                                menu: row.menu,
                                comment: row.review,
                                author: row.nickname,
                                replies: []
                            };
                            window.globalArchiveData.push(newPlace);
                            addArchiveMarker(newPlace);
                            updateArchiveList();
                        }
                    )
                    .subscribe();

            } catch (err) {
                console.error('Supabase DB 연결 오류:', err);
                archiveListBody.innerHTML = '<li style="text-align:center; color:#ff4444; padding: 32px 0; border:none; background:transparent; cursor:default;">데이터베이스 연결에 실패했습니다.<br>콘솔창을 확인하세요.</li>';
            }
        }

        function getTagColor(tag) {
            switch (tag) {
                case '야작': return '#00E5FF';
                case '카페': return '#FF00FF';
                case '카공': return '#00FF00';
                default: return 'var(--accent-color)';
            }
        }

        function addArchiveMarker(place) {
            const markerPos = new kakao.maps.LatLng(place.lat, place.lon);
            const tagColor = getTagColor(place.tag);

            const markerContent = document.createElement('div');
            markerContent.style.filter = COUNTER_FILTER;
            markerContent.innerHTML = `
                    <div class="custom-marker">
                        <div class="marker-wrapper">
                            <div class="marker-shadow"></div>
                            <div class="marker-pin" style="background: ${tagColor}; box-shadow: 0 0 10px ${tagColor};"></div>
                        </div>
                        <div class="marker-label" style="display:none; position:absolute; top:-100px; left:50%; transform:translateX(-50%); background:var(--panel-bg); color:var(--text-color); padding:12px; border-radius:12px; border:1px solid ${tagColor}; font-size:12px; white-space:nowrap; box-shadow:0 8px 24px rgba(0,0,0,0.8); z-index:100; pointer-events:none; min-width: 160px;">
                            <div style="background: ${tagColor}; color: #000; padding: 2px 6px; border-radius: 4px; font-weight: 800; display: inline-block; margin-bottom: 6px; font-size: 10px;">#${place.tag}</div>
                            <strong style="color:${tagColor}; display:block; font-size:15px; margin-bottom:4px;">${place.name}</strong>
                            <span style="color:var(--text-muted); display:block; margin-bottom: 8px;">${place.address}</span>
                            ${place.menu ? `<div style="margin-bottom: 4px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px; text-align: left;"><strong>🍽️ 추천:</strong> <span style="color: #fff;">${place.menu}</span></div>` : ''}
                            ${place.comment ? `<div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; margin-top: 6px; text-align: left;"><em style="color: #ddd;">"${place.comment}"</em><br><div style="color:var(--text-muted); font-size:11px; margin-top: 4px; text-align: right;">- by <b>${place.author}</b></div></div>` : ''}
                        </div>
                    </div>
                `;

            const overlay = new kakao.maps.CustomOverlay({
                position: markerPos,
                content: markerContent,
                yAnchor: 1
            });

            // Hover effect for marker to show label
            markerContent.addEventListener('mouseenter', () => {
                markerContent.querySelector('.marker-label').style.display = 'block';
                markerContent.style.zIndex = "100";
            });
            markerContent.addEventListener('mouseleave', () => {
                markerContent.querySelector('.marker-label').style.display = 'none';
                markerContent.style.zIndex = "";
            });

            overlay.setMap(map);
            registeredOverlays.push({ id: place.id, overlay });
        }

        function showArchivePopup(place, latlng) {
            if (tempOverlay) tempOverlay.setMap(null);

            const contentStr = document.createElement('div');
            contentStr.className = 'kakao-popup';
            contentStr.style.filter = COUNTER_FILTER;
            contentStr.style.minWidth = "260px";
            contentStr.style.maxWidth = "300px";

            const tagColor = getTagColor(place.tag);
            const replies = place.replies || [];

            let repliesHtml = replies.map(r => `
                <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; margin-bottom: 6px;">
                    <strong style="color:var(--accent-color); font-size: 11px;">${r.author}</strong>
                    <div style="font-size: 12px; margin-top: 2px; color: #fff;">${r.comment}</div>
                </div>
            `).join('');

            contentStr.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <div style="background: ${tagColor}; color: #000; padding: 2px 6px; border-radius: 4px; font-weight: 800; font-size: 10px;">#${place.tag}</div>
                    <div class="close-btn" style="cursor:pointer; font-size:18px; color:var(--text-muted);">&times;</div>
                </div>
                <div class="popup-title" style="font-size: 18px; margin-bottom: 4px; text-align: left;">${place.name}</div>
                <div style="font-size:12px; color:var(--text-muted); margin-bottom: 12px; text-align: left; word-break: keep-all;">${place.address}</div>
                
                ${place.menu ? `<div style="margin-bottom: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; text-align: left;"><strong>🍽️ 추천 메뉴:</strong> <span style="color: #fff;">${place.menu}</span></div>` : ''}
                
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; max-height: 150px; overflow-y: auto; text-align: left; margin-bottom: 12px;">
                    <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px; text-align: center;">--- 동기들의 리뷰 ---</div>
                    ${place.comment ? `
                    <div style="background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; margin-bottom: 6px;">
                        <strong style="color:var(--accent-color); font-size: 11px;">${place.author} (최초 추천자)</strong>
                        <div style="font-size: 12px; margin-top: 2px; color: #fff;">${place.comment}</div>
                    </div>` : ''}
                    ${repliesHtml}
                </div>
                
                <div style="display: flex; gap: 8px;">
                    <input type="text" id="reply-input" placeholder="댓글 달기..." autocomplete="off" style="flex: 1; padding: 8px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.3); color:#fff; border-radius: 4px; outline:none; box-sizing: border-box; font-size: 12px;">
                    <button class="register-btn" id="reply-btn" style="background: var(--accent-hover); width: auto; font-size: 12px; padding: 0 12px; margin: 0;">등록</button>
                </div>
            `;

            contentStr.querySelector('.close-btn').onclick = () => {
                if (tempOverlay) tempOverlay.setMap(null);
            };

            contentStr.querySelector('#reply-btn').onclick = () => {
                const replyInput = contentStr.querySelector('#reply-input');
                const text = replyInput.value.trim();
                if (!text) return;

                const author = localStorage.getItem('current_nickname') || '익명동기';

                const targetIdx = window.globalArchiveData.findIndex(p => p.id === place.id);
                if (targetIdx > -1) {
                    window.globalArchiveData[targetIdx].replies.push({
                        author,
                        comment: text,
                        time: Date.now()
                    });

                    showArchivePopup(window.globalArchiveData[targetIdx], latlng);
                }
            };

            contentStr.querySelector('#reply-input').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') contentStr.querySelector('#reply-btn').click();
            });

            tempOverlay = new kakao.maps.CustomOverlay({
                position: latlng,
                content: contentStr,
                yAnchor: 1.2,
                zIndex: 10,
                clickable: true
            });
            tempOverlay.setMap(map);

            setTimeout(() => contentStr.querySelector('#reply-input').focus(), 100);
        }

        function updateArchiveList() {
            const archiveData = window.globalArchiveData || [];
            archiveListBody.innerHTML = '';

            if (archiveData.length === 0) {
                archiveListBody.innerHTML = '<li style="text-align:center; color:var(--text-muted); padding: 32px 0; border:none; background:transparent; cursor:default;">아직 등록된 맛집이 없습니다.<br>검색하여 첫 번째 맛집을 추가해보세요.</li>';
                return;
            }

            [...archiveData].reverse().forEach(place => {
                const li = document.createElement('li');
                li.innerHTML = `
                        <strong>${place.name}</strong>
                        <span>${place.address}</span>
                    `;
                li.addEventListener('click', () => {
                    const moveLatLon = new kakao.maps.LatLng(place.lat, place.lon);
                    map.panTo(moveLatLon);
                    showArchivePopup(place, moveLatLon);
                });
                archiveListBody.appendChild(li);
            });
        }
    } // end of initMap()
});
