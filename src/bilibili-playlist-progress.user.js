// ==UserScript==
// @name         Bilibili播放列表进度显示
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  在B站视频播放页面显示当前视频在播放列表中的进度位置
// @author       KoJail
// @match        https://www.bilibili.com/video/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 保存进度显示元素的引用，以便后续更新
    let progressDisplay = null;
    let playlistObserver = null;

    // 等待页面加载完成后再执行脚本
    window.addEventListener('load', function () {
        // 主函数：计算并显示播放列表进度
        function showPlaylistProgress() {
            // 查找页面上的选集列表元素
            const playlistContainer = document.querySelector('.video-pod__list');
            if (!playlistContainer) {
                console.log('未找到选集列表');
                return;
            }

            // 获取所有视频项
            const videoItems = playlistContainer.querySelectorAll('.simple-base-item.video-pod__item.normal');
            if (videoItems.length === 0) {
                console.log('未找到视频列表项');
                return;
            }

            // 获取当前播放的视频项（通常有特殊样式标记）
            const currentVideo = playlistContainer.querySelector('.simple-base-item.video-pod__item.active.normal');
            if (!currentVideo) {
                console.log('未找到当前播放视频');
                return;
            }

            // 计算当前视频在列表中的位置（从0开始）
            let currentIndex = -1;
            for (let i = 0; i < videoItems.length; i++) {
                if (videoItems[i] === currentVideo) {
                    currentIndex = i;
                    break;
                }
            }

            // 如果没有找到当前视频，直接返回
            if (currentIndex === -1) {
                console.log('无法确定当前视频位置');
                return;
            }

            // 计算总时长和当前进度
            let totalTime = 0; // 所有视频的总时长（秒）
            let currentTime = 0; // 到当前视频为止的累计时长（秒）

            // 遍历所有视频项，提取时长信息
            for (let i = 0; i < videoItems.length; i++) {
                const item = videoItems[i];

                // 查找视频时长元素（通常以 "mm:ss" 格式显示）
                const timeElement = item.querySelector('.stat-item.duration');
                if (!timeElement) continue;

                // 获取时长文本，例如 "12:34"
                const timeText = timeElement.textContent.trim();

                // 将 "mm:ss" 格式转换为总秒数
                const timeParts = timeText.split(':');
                let seconds = 0;
                if (timeParts.length === 2) {
                    // 分钟转秒 + 剩余秒数
                    seconds = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);
                } else if (timeParts.length === 3) {
                    // 小时转秒 + 分钟转秒 + 剩余秒数
                    seconds = parseInt(timeParts[0]) * 3600 + parseInt(timeParts[1]) * 60 + parseInt(timeParts[2]);
                }

                // 累加到总时长
                totalTime += seconds;

                // 如果是之前的视频，则累加到当前观看时长
                if (i < currentIndex) {
                    currentTime += seconds;
                }
            }

            // 计算观看进度百分比
            const progressPercent = (currentTime / totalTime) * 100;

            // 如果进度显示元素已存在，则更新它，否则创建新的
            if (progressDisplay) {
                updateProgressDisplayContent(currentIndex, videoItems.length, currentTime, totalTime, progressPercent);
            } else {
                createProgressDisplay(currentIndex, videoItems.length, currentTime, totalTime, progressPercent);

                // 设置监听器
                setupObservers(playlistContainer);
            }
        }

        // 创建进度显示元素
        function createProgressDisplay(currentIndex, totalVideos, currentTime, totalTime, progressPercent) {
            progressDisplay = document.createElement('div');
            progressDisplay.id = 'playlist-progress-display';

            // 设置基础样式（不包含颜色）
            progressDisplay.style.cssText = `
                border-radius: 4px;
                padding: 10px;
                margin: 10px 0;
                font-size: 14px;
            `;

            // 设置进度显示内容
            progressDisplay.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">播放列表进度</div>
                <div>当前视频: ${currentIndex + 1}/${totalVideos}</div>
                <div>观看时长: ${formatTime(currentTime)}/${formatTime(totalTime)}</div>
                <div style="margin-top: 5px;">
                    <div class="progress-bg" style="border-radius: 2px; height: 8px;">
                        <div class="progress-bar" style="height: 100%; width: ${progressPercent}%; border-radius: 2px;"></div>
                    </div>
                    <div class="progress-text" style="text-align: right; font-size: 12px; margin-top: 2px;">${progressPercent.toFixed(1)}%</div>
                </div>
            `;

            // 动态应用主题样式
            applyThemeStyles();

            // 将进度显示元素插入到选集列表上方
            const playlistContainer = document.querySelector('.video-pod__list');
            if (playlistContainer) {
                playlistContainer.parentNode.insertBefore(progressDisplay, playlistContainer);
            }
        }

        // 更新进度显示内容
        function updateProgressDisplayContent(currentIndex, totalVideos, currentTime, totalTime, progressPercent) {
            if (!progressDisplay) return;

            progressDisplay.querySelector('div:nth-child(2)').innerHTML = `当前视频: ${currentIndex + 1}/${totalVideos}`;
            progressDisplay.querySelector('div:nth-child(3)').innerHTML = `观看时长: ${formatTime(currentTime)}/${formatTime(totalTime)}`;
            progressDisplay.querySelector('.progress-bar').style.width = `${progressPercent}%`;
            progressDisplay.querySelector('.progress-text').textContent = `${progressPercent.toFixed(1)}%`;

            // 重新应用主题样式（以防主题发生变化）
            applyThemeStyles();
        }

        // 动态应用主题样式
        function applyThemeStyles() {
            if (!progressDisplay) return;

            // 获取主题链接元素
            const themeLink = document.querySelector('link[id="__css-map__"]');

            // 检查 href 属性来判断主题模式
            const isDarkMode = themeLink && themeLink.href.includes('dark.css');

            if (isDarkMode) {
                // 深色模式样式
                progressDisplay.style.backgroundColor = '#232527';
                progressDisplay.style.color = '#e0e0e0';

                progressDisplay.querySelector('div:nth-child(2)').style.color = '#aaa';
                progressDisplay.querySelector('.progress-bg').style.backgroundColor = '#444';
                progressDisplay.querySelector('.progress-bar').style.backgroundColor = '#00a1d6';
                progressDisplay.querySelector('.progress-text').style.color = '#888';
            } else {
                // 浅色模式样式
                progressDisplay.style.backgroundColor = '#f1f2f3';
                progressDisplay.style.color = '#212121';

                progressDisplay.querySelector('div:nth-child(2)').style.color = '#666';
                progressDisplay.querySelector('.progress-bg').style.backgroundColor = '#eee';
                progressDisplay.querySelector('.progress-bar').style.backgroundColor = '#00a1d6';
                progressDisplay.querySelector('.progress-text').style.color = '#999';
            }
        }

        // 设置观察器
        function setupObservers(playlistContainer) {
            // 监听主题变化
            const themeLink = document.querySelector('link[id="__css-map__"]');

            if (themeLink) {
                // 监听主题链接的 href 属性变化
                const themeObserver = new MutationObserver(function (mutations) {
                    mutations.forEach(function (mutation) {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'href') {
                            // 当 href 属性变化时，重新应用主题样式
                            setTimeout(applyThemeStyles, 50); // 短延迟确保新样式已应用
                        }
                    });
                });

                // 开始观察主题链接元素的 href 属性变化
                themeObserver.observe(themeLink, {
                    attributes: true,
                    attributeFilter: ['href'] // 只监听 href 属性
                });
            } else {
                // 如果还没找到主题链接，稍后再试
                setTimeout(checkThemeLink, 500);
            }

            // 监听播放列表变化
            playlistObserver = new MutationObserver(function (mutations) {
                let shouldUpdate = false;

                mutations.forEach(function (mutation) {
                    // 只检查active类的变化，这表示当前播放视频发生了变化
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const target = mutation.target;
                        if (target.classList && target.classList.contains('active')) {
                            shouldUpdate = true;
                        }
                    }
                });

                if (shouldUpdate) {
                    // 延迟执行，确保页面元素已经更新
                    setTimeout(showPlaylistProgress, 500);
                }
            });

            // 开始观察播放列表区域
            if (playlistContainer) {
                playlistObserver.observe(playlistContainer, {
                    attributes: true,
                    subtree: true,
                    attributeFilter: ['class']
                });
            }

            // 监听URL变化（用户可能通过浏览器前进/后退切换视频）
            let lastUrl = location.href;
            new MutationObserver(() => {
                const url = location.href;
                if (url !== lastUrl) {
                    lastUrl = url;
                    // 延迟执行，确保页面加载完成
                    setTimeout(showPlaylistProgress, 1000);
                }
            }).observe(document, { subtree: true, childList: true });
        }

        // 辅助函数：将秒数格式化为 "hh:mm:ss" 或 "mm:ss" 格式
        function formatTime(seconds) {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);

            if (h > 0) {
                // 如果有小时数，格式为 "hh:mm:ss"
                return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            } else {
                // 否则格式为 "mm:ss"
                return `${m}:${s.toString().padStart(2, '0')}`;
            }
        }

        // 延迟执行以确保页面元素完全加载
        setTimeout(showPlaylistProgress, 2000);
    });
})();