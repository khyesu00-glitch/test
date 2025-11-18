const fs = require('fs').promises;
const path = require('path');

class FileOrganizer {
  constructor() {
    this.settings = {
      categories: {
        '이미지': ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'],
        '문서': ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.odt'],
        '비디오': ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm', '.m4v'],
        '오디오': ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.wma', '.m4a'],
        '압축파일': ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'],
        '프로그램': ['.exe', '.msi', '.dmg', '.pkg', '.deb', '.rpm', '.app'],
        '코드': ['.js', '.py', '.java', '.cpp', '.c', '.h', '.css', '.html', '.json', '.xml', '.sql', '.sh', '.rb', '.go', '.rs', '.ts', '.tsx', '.jsx'],
        '기타': []
      },
      createDateFolders: false,
      skipHiddenFiles: true
    };
  }

  getSettings() {
    return this.settings;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }

  getCategory(fileName) {
    const ext = path.extname(fileName).toLowerCase();

    for (const [category, extensions] of Object.entries(this.settings.categories)) {
      if (category === '기타') continue;
      if (extensions.includes(ext)) {
        return category;
      }
    }

    return '기타';
  }

  async scanFolder(folderPath) {
    try {
      const files = await fs.readdir(folderPath, { withFileTypes: true });
      const preview = {};

      for (const file of files) {
        // 숨김 파일 건너뛰기
        if (this.settings.skipHiddenFiles && file.name.startsWith('.')) {
          continue;
        }

        // 디렉토리 건너뛰기
        if (file.isDirectory()) {
          continue;
        }

        const category = this.getCategory(file.name);

        if (!preview[category]) {
          preview[category] = [];
        }

        const filePath = path.join(folderPath, file.name);
        const stats = await fs.stat(filePath);

        preview[category].push({
          name: file.name,
          size: stats.size,
          modified: stats.mtime
        });
      }

      return preview;
    } catch (error) {
      throw new Error(`폴더 스캔 중 오류 발생: ${error.message}`);
    }
  }

  async organizeFiles(folderPath, options = {}) {
    try {
      const files = await fs.readdir(folderPath, { withFileTypes: true });
      const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        details: []
      };

      for (const file of files) {
        // 숨김 파일 건너뛰기
        if (this.settings.skipHiddenFiles && file.name.startsWith('.')) {
          results.skipped++;
          continue;
        }

        // 디렉토리 건너뛰기
        if (file.isDirectory()) {
          results.skipped++;
          continue;
        }

        try {
          const category = this.getCategory(file.name);
          const sourcePath = path.join(folderPath, file.name);

          // 카테고리 폴더 생성
          const categoryPath = path.join(folderPath, category);
          await fs.mkdir(categoryPath, { recursive: true });

          // 날짜별 폴더 생성 (옵션)
          let targetFolder = categoryPath;
          if (this.settings.createDateFolders) {
            const stats = await fs.stat(sourcePath);
            const date = stats.mtime;
            const dateFolder = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            targetFolder = path.join(categoryPath, dateFolder);
            await fs.mkdir(targetFolder, { recursive: true });
          }

          // 파일 이동
          const targetPath = path.join(targetFolder, file.name);

          // 파일이 이미 존재하는 경우 처리
          try {
            await fs.access(targetPath);
            // 파일이 존재하면 번호를 붙임
            const ext = path.extname(file.name);
            const nameWithoutExt = path.basename(file.name, ext);
            let counter = 1;
            let newTargetPath = targetPath;

            while (true) {
              newTargetPath = path.join(targetFolder, `${nameWithoutExt}_${counter}${ext}`);
              try {
                await fs.access(newTargetPath);
                counter++;
              } catch {
                break;
              }
            }

            await fs.rename(sourcePath, newTargetPath);
          } catch {
            // 파일이 존재하지 않으면 그냥 이동
            await fs.rename(sourcePath, targetPath);
          }

          results.success++;
          results.details.push({
            file: file.name,
            category: category,
            status: 'success'
          });
        } catch (error) {
          results.failed++;
          results.details.push({
            file: file.name,
            status: 'failed',
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`파일 정리 중 오류 발생: ${error.message}`);
    }
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

module.exports = FileOrganizer;
