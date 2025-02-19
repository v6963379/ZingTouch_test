document.addEventListener('DOMContentLoaded', () => {
    const gestureArea = document.getElementById('gesture-area');
    const logContent = document.getElementById('log-content');
    const downloadBtn = document.getElementById('download-btn');
    
    // Массив для хранения всех событий
    let gestureEvents = [];
    
    // Инициализация ZingTouch
    const zt = new ZingTouch.Region(gestureArea);
    
    // Функция для добавления записи в лог
    function addToLog(message) {
        const logEntry = document.createElement('p');
        logEntry.textContent = message;
        logContent.appendChild(logEntry);
        logContent.scrollTop = logContent.scrollHeight;
        
        // Сохраняем событие
        gestureEvents.push({
            timestamp: new Date().toISOString(),
            event: message
        });
    }
    
    // Функция для получения координаты относительно gesture-area
    function getRelativeCoordinates(event) {
        try {
            const rect = gestureArea.getBoundingClientRect();
            const touch = event.detail.events[0];
            if (!touch) return { x: 0, y: 0 }; // Возвращаем default значения если нет touch события
            
            return {
                x: Math.round(touch.clientX - rect.left),
                y: Math.round(touch.clientY - rect.top)
            };
        } catch (error) {
            console.error('Error getting coordinates:', error);
            return { x: 0, y: 0 };
        }
    }
    
    // Функция для расчета расстояния
    function calculateDistance(event) {
        try {
            if (!event.detail || !event.detail.data || !event.detail.data[0]) {
                return 0;
            }

            const data = event.detail.data[0];
            // Используем абсолютные значения перемещения
            const distanceX = Math.abs(data.distanceFromOrigin) || 0;
            const distanceY = Math.abs(data.distanceFromLast) || 0;
            
            // Возвращаем большее из значений для более точного отображения
            return Math.round(Math.max(distanceX, distanceY));

        } catch (error) {
            console.error('Error calculating distance:', error);
            return 0;
        }
    }
    
    // Настройка распознавания жестов
    
    // 1. Tap (касание)
    zt.bind(gestureArea, 'tap', (e) => {
        const coords = getRelativeCoordinates(e);
        addToLog(`Tap detected at (${coords.x}, ${coords.y})`);
    });
    
    // 2. Swipe (свайп)
    zt.bind(gestureArea, 'swipe', (e) => {
        const velocity = Math.abs(Math.round(e.detail.data[0].velocity));
        addToLog(`Swipe detected with velocity: ${velocity} px/ms`);
    });
    
    // 3. Rotate (вращение)
    zt.bind(gestureArea, 'rotate', (e) => {
        const angle = Math.round(e.detail.angle);
        addToLog(`Rotation detected: ${angle}°`);
    });
    
    // 4. Pan (перетаскивание)
    zt.bind(gestureArea, 'pan', (e) => {
        try {
            const coords = getRelativeCoordinates(e);
            const distance = calculateDistance(e);
            
            // Логируем детали события для отладки
            console.log('Pan event details:', {
                data: e.detail.data[0],
                distance: distance,
                coords: coords
            });
            
            addToLog(`Pan detected: distance ${distance}px at (${coords.x}, ${coords.y})`);
        } catch (error) {
            console.error('Error in pan handler:', error);
            addToLog(`Pan detected at (${coords.x}, ${coords.y})`);
        }
    });
    
    // 5. Expand/Pinch (масштабирование)
    zt.bind(gestureArea, 'expand', (e) => {
        const scale = e.detail.scale.toFixed(2);
        const coords = getRelativeCoordinates(e);
        addToLog(`${scale > 1 ? 'Expand' : 'Pinch'} detected: scale ${scale} at (${coords.x}, ${coords.y})`);
    });
    
    // Обработка кнопки скачивания
    downloadBtn.addEventListener('click', () => {
        const dataStr = JSON.stringify(gestureEvents, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'gesture-data.json';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });

    // Функция анализа жестов
    function analyzeGestures(events) {
        const analysis = {
            totalEvents: events.length,
            tapEvents: events.filter(e => e.event.startsWith('Tap')),
            rotationEvents: events.filter(e => e.event.startsWith('Rotation')),
            panEvents: events.filter(e => e.event.startsWith('Pan'))
        };

        let html = '';

        // Общая статистика
        html += `<div class="stat-group">
            <h4>Общая статистика:</h4>
            <div class="stat-item">Всего событий: ${analysis.totalEvents}</div>
            <div class="stat-item">Количество касаний: ${analysis.tapEvents.length}</div>
            <div class="stat-item">Количество вращений: ${analysis.rotationEvents.length}</div>
            <div class="stat-item">Количество перемещений: ${analysis.panEvents.length}</div>
        </div>`;

        // Анализ касаний
        if (analysis.tapEvents.length > 0) {
            html += `<div class="stat-group">
                <h4>Анализ касаний:</h4>
                <div class="stat-item">Координаты касаний:</div>
                ${analysis.tapEvents.map(e => {
                    const coords = e.event.match(/\((\d+), (\d+)\)/);
                    return `<div class="stat-item">• (${coords[1]}, ${coords[2]})</div>`;
                }).join('')}
            </div>`;
        }

        // Анализ вращений
        if (analysis.rotationEvents.length > 0) {
            const angles = analysis.rotationEvents.map(e => 
                parseInt(e.event.match(/detected: (\d+)°/)[1])
            );
            const maxAngle = Math.max(...angles);
            const minAngle = Math.min(...angles);
            
            html += `<div class="stat-group">
                <h4>Анализ вращений:</h4>
                <div class="stat-item">Максимальный угол: ${maxAngle}°</div>
                <div class="stat-item">Минимальный угол: ${minAngle}°</div>
                <div class="stat-item">Диапазон вращения: ${maxAngle - minAngle}°</div>
            </div>`;
        }

        // Анализ перемещений
        if (analysis.panEvents.length > 0) {
            const distances = analysis.panEvents.map(e => {
                const match = e.event.match(/distance (\d+)px/);
                return match ? parseInt(match[1]) : 0;
            });
            const maxDistance = Math.max(...distances);
            
            html += `<div class="stat-group">
                <h4>Анализ перемещений:</h4>
                <div class="stat-item">Максимальное расстояние: ${maxDistance}px</div>
                <div class="stat-item">Среднее расстояние: ${Math.round(distances.reduce((a, b) => a + b, 0) / distances.length)}px</div>
            </div>`;
        }

        return html;
    }

    // Добавляем обработчик для кнопки анализа
    const analyzeBtn = document.getElementById('analyze-btn');
    const analysisContent = document.getElementById('analysis-content');

    analyzeBtn.addEventListener('click', () => {
        const analysisHtml = analyzeGestures(gestureEvents);
        analysisContent.innerHTML = analysisHtml;
    });

    // Добавляем обработчик для кнопки очистки
    const clearBtn = document.getElementById('clear-btn');
    clearBtn.addEventListener('click', () => {
        // Очищаем массив событий
        gestureEvents = [];
        
        // Очищаем лог на странице
        const logContent = document.getElementById('log-content');
        logContent.innerHTML = '';
        
        // Очищаем результаты анализа
        const analysisContent = document.getElementById('analysis-content');
        analysisContent.innerHTML = '';
    });
}); 