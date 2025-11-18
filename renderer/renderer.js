// DOM 요소들
const folderPathInput = document.getElementById('folderPath');
const selectFolderBtn = document.getElementById('selectFolderBtn');
const useDownloadsBtn = document.getElementById('useDownloadsBtn');
const previewSection = document.getElementById('previewSection');
const previewContent = document.getElementById('previewContent');
const organizeBtn = document.getElementById('organizeBtn');
const rescanBtn = document.getElementById('rescanBtn');
const resultsSection = document.getElementById('resultsSection');
const resultsContent = document.getElementById('resultsContent');
const newScanBtn = document.getElementById('newScanBtn');
const statusBar = document.getElementById('statusBar');
const loadingOverlay = document.getElementById('loadingOverlay');
const createDateFoldersCheckbox = document.getElementById('createDateFolders');
const skipHiddenFilesCheckbox = document.getElementById('skipHiddenFiles');

let currentFolderPath = '';

// 설정 로드
async function loadSettings() {
  const result = await window.electronAPI.getSettings();
  createDateFoldersCheckbox.checked = result.createDateFolders;
  skipHiddenFilesCheckbox.checked = result.skipHiddenFiles;
}

// 설정 저장
async function saveSettings() {
  const settings = {
    createDateFolders: createDateFoldersCheckbox.checked,
    skipHiddenFiles: skipHiddenFilesCheckbox.checked
  };
  await window.electronAPI.saveSettings(settings);
}

// 파일 크기 포맷팅
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 상태 업데이트
function updateStatus(message) {
  statusBar.textContent = message;
}

// 로딩 표시
function showLoading(show) {
  loadingOverlay.style.display = show ? 'flex' : 'none';
}

// 폴더 선택
selectFolderBtn.addEventListener('click', async () => {
  const folderPath = await window.electronAPI.selectFolder();
  if (folderPath) {
    currentFolderPath = folderPath;
    folderPathInput.value = folderPath;
    await scanFolder(folderPath);
  }
});

// 다운로드 폴더 사용
useDownloadsBtn.addEventListener('click', async () => {
  const downloadsPath = await window.electronAPI.getDownloadsPath();
  currentFolderPath = downloadsPath;
  folderPathInput.value = downloadsPath;
  await scanFolder(downloadsPath);
});

// 폴더 스캔
async function scanFolder(folderPath) {
  showLoading(true);
  updateStatus('폴더를 스캔하는 중...');
  resultsSection.style.display = 'none';

  try {
    await saveSettings();
    const result = await window.electronAPI.scanFolder(folderPath);

    if (result.success) {
      displayPreview(result.data);
      previewSection.style.display = 'block';
      updateStatus(`${countTotalFiles(result.data)}개의 파일을 찾았습니다`);
    } else {
      alert('오류: ' + result.error);
      updateStatus('스캔 실패');
    }
  } catch (error) {
    alert('스캔 중 오류가 발생했습니다: ' + error.message);
    updateStatus('스캔 실패');
  } finally {
    showLoading(false);
  }
}

// 전체 파일 수 계산
function countTotalFiles(preview) {
  let total = 0;
  for (const files of Object.values(preview)) {
    total += files.length;
  }
  return total;
}

// 미리보기 표시
function displayPreview(preview) {
  previewContent.innerHTML = '';

  const categories = Object.keys(preview).sort();

  if (categories.length === 0) {
    previewContent.innerHTML = '<p style="text-align: center; color: #6c757d;">정리할 파일이 없습니다.</p>';
    organizeBtn.disabled = true;
    return;
  }

  organizeBtn.disabled = false;

  categories.forEach(category => {
    const files = preview[category];
    if (files.length === 0) return;

    const categoryDiv = document.createElement('div');
    categoryDiv.className = 'category-group';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'category-header';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'category-name';
    nameSpan.textContent = category;

    const countSpan = document.createElement('span');
    countSpan.className = 'file-count';
    countSpan.textContent = `${files.length}개 파일`;

    headerDiv.appendChild(nameSpan);
    headerDiv.appendChild(countSpan);

    const fileList = document.createElement('ul');
    fileList.className = 'file-list';

    files.forEach(file => {
      const li = document.createElement('li');
      li.className = 'file-item';

      const fileName = document.createElement('span');
      fileName.className = 'file-name';
      fileName.textContent = file.name;

      const fileSize = document.createElement('span');
      fileSize.className = 'file-size';
      fileSize.textContent = formatFileSize(file.size);

      li.appendChild(fileName);
      li.appendChild(fileSize);
      fileList.appendChild(li);
    });

    categoryDiv.appendChild(headerDiv);
    categoryDiv.appendChild(fileList);
    previewContent.appendChild(categoryDiv);
  });
}

// 정리 시작
organizeBtn.addEventListener('click', async () => {
  if (!currentFolderPath) {
    alert('폴더를 선택해주세요.');
    return;
  }

  const confirmed = confirm('파일을 정리하시겠습니까?\n파일들이 카테고리별 폴더로 이동됩니다.');
  if (!confirmed) return;

  showLoading(true);
  updateStatus('파일을 정리하는 중...');

  try {
    await saveSettings();
    const result = await window.electronAPI.organizeFiles(currentFolderPath, {});

    if (result.success) {
      displayResults(result.data);
      previewSection.style.display = 'none';
      resultsSection.style.display = 'block';
      updateStatus('정리 완료!');
    } else {
      alert('오류: ' + result.error);
      updateStatus('정리 실패');
    }
  } catch (error) {
    alert('정리 중 오류가 발생했습니다: ' + error.message);
    updateStatus('정리 실패');
  } finally {
    showLoading(false);
  }
});

// 결과 표시
function displayResults(results) {
  resultsContent.innerHTML = '';

  // 성공 메시지
  if (results.success > 0) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `<strong>✓ 성공!</strong> ${results.success}개의 파일이 정리되었습니다.`;
    resultsContent.appendChild(successDiv);
  }

  // 통계
  const statsDiv = document.createElement('div');
  statsDiv.className = 'results-stats';

  const stats = [
    { label: '성공', value: results.success, color: '#28a745' },
    { label: '실패', value: results.failed, color: '#dc3545' },
    { label: '건너뜀', value: results.skipped, color: '#ffc107' }
  ];

  stats.forEach(stat => {
    const statCard = document.createElement('div');
    statCard.className = 'stat-card';
    statCard.innerHTML = `
      <div class="stat-number" style="color: ${stat.color}">${stat.value}</div>
      <div class="stat-label">${stat.label}</div>
    `;
    statsDiv.appendChild(statCard);
  });

  resultsContent.appendChild(statsDiv);

  // 실패한 파일들 표시
  if (results.failed > 0) {
    const failedFiles = results.details.filter(d => d.status === 'failed');
    if (failedFiles.length > 0) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      let errorHTML = '<strong>⚠ 실패한 파일들:</strong><ul style="margin-top: 10px;">';
      failedFiles.forEach(file => {
        errorHTML += `<li>${file.file}: ${file.error}</li>`;
      });
      errorHTML += '</ul>';
      errorDiv.innerHTML = errorHTML;
      resultsContent.appendChild(errorDiv);
    }
  }

  // 카테고리별 성공한 파일들 표시
  const successFiles = results.details.filter(d => d.status === 'success');
  if (successFiles.length > 0) {
    const categoriesDiv = document.createElement('div');
    categoriesDiv.style.marginTop = '20px';

    const categoryGroups = {};
    successFiles.forEach(file => {
      if (!categoryGroups[file.category]) {
        categoryGroups[file.category] = [];
      }
      categoryGroups[file.category].push(file.file);
    });

    Object.keys(categoryGroups).sort().forEach(category => {
      const files = categoryGroups[category];
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'category-group';

      const headerDiv = document.createElement('div');
      headerDiv.className = 'category-header';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'category-name';
      nameSpan.textContent = `${category}로 이동됨`;

      const countSpan = document.createElement('span');
      countSpan.className = 'file-count';
      countSpan.textContent = `${files.length}개`;

      headerDiv.appendChild(nameSpan);
      headerDiv.appendChild(countSpan);

      const fileList = document.createElement('ul');
      fileList.className = 'file-list';

      files.forEach(fileName => {
        const li = document.createElement('li');
        li.className = 'file-item';
        li.textContent = fileName;
        fileList.appendChild(li);
      });

      categoryDiv.appendChild(headerDiv);
      categoryDiv.appendChild(fileList);
      categoriesDiv.appendChild(categoryDiv);
    });

    resultsContent.appendChild(categoriesDiv);
  }
}

// 다시 스캔
rescanBtn.addEventListener('click', async () => {
  if (currentFolderPath) {
    await scanFolder(currentFolderPath);
  }
});

// 새로 시작
newScanBtn.addEventListener('click', () => {
  resultsSection.style.display = 'none';
  previewSection.style.display = 'none';
  folderPathInput.value = '';
  currentFolderPath = '';
  updateStatus('준비');
});

// 설정 변경 시 자동 저장
createDateFoldersCheckbox.addEventListener('change', saveSettings);
skipHiddenFilesCheckbox.addEventListener('change', saveSettings);

// 초기화
loadSettings();
updateStatus('준비');
