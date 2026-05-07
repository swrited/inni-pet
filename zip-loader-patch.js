// 为 pixi-live2d-display 的 ZipLoader 提供 JSZip 实现
(function() {
  if (!window.JSZip) {
    console.error('JSZip not loaded');
    return;
  }

  // 等待 PIXI.live2d 加载完成
  const checkInterval = setInterval(() => {
    if (window.PIXI && window.PIXI.live2d) {
      clearInterval(checkInterval);

      // 获取 ZipLoader 类
      const ZipLoader = window.PIXI.live2d.ZipLoader;

      if (!ZipLoader) {
        console.error('ZipLoader not found');
        return;
      }

      console.log('Patching ZipLoader...');

      // 覆盖 zipReader 方法 - 这是关键！
      ZipLoader.zipReader = async function(blob, url) {
        console.log('ZipLoader.zipReader called with blob:', blob.size, 'bytes, type:', blob.type);
        try {
          // 确保 blob 是正确的格式
          let arrayBuffer;
          if (blob instanceof ArrayBuffer) {
            arrayBuffer = blob;
          } else if (blob instanceof Blob) {
            arrayBuffer = await blob.arrayBuffer();
          } else {
            throw new Error('Invalid blob type: ' + typeof blob);
          }

          console.log('arrayBuffer size:', arrayBuffer.byteLength);

          const zip = new JSZip();
          const unzipped = await zip.loadAsync(arrayBuffer);
          const files = [];

          for (const [path, file] of Object.entries(unzipped.files)) {
            if (!file.dir) {
              const fileBlob = await file.async('blob');
              const f = new File([fileBlob], path, { type: 'application/octet-stream' });
              f.webkitRelativePath = path;
              files.push(f);
            }
          }

          console.log('ZipLoader.zipReader returning', files.length, 'files');
          return files;
        } catch (error) {
          console.error('ZipLoader.zipReader error:', error);
          throw error;
        }
      };

      // 覆盖其他方法
      ZipLoader.getFilePaths = async function(blob) {
        const arrayBuffer = blob instanceof ArrayBuffer ? blob : await blob.arrayBuffer();
        const zip = new JSZip();
        const unzipped = await zip.loadAsync(arrayBuffer);
        return Object.keys(unzipped.files).filter(path => !unzipped.files[path].dir);
      };

      ZipLoader.getFiles = async function(blob, paths) {
        const arrayBuffer = blob instanceof ArrayBuffer ? blob : await blob.arrayBuffer();
        const zip = new JSZip();
        const unzipped = await zip.loadAsync(arrayBuffer);
        const files = [];

        for (const path of paths) {
          const file = unzipped.files[path];
          if (file && !file.dir) {
            const fileBlob = await file.async('blob');
            const f = new File([fileBlob], path, { type: 'application/octet-stream' });
            f.webkitRelativePath = path;
            files.push(f);
          }
        }

        return files;
      };

      ZipLoader.readText = async function(blob, path) {
        const arrayBuffer = blob instanceof ArrayBuffer ? blob : await blob.arrayBuffer();
        const zip = new JSZip();
        const unzipped = await zip.loadAsync(arrayBuffer);
        const file = unzipped.files[path];
        if (file && !file.dir) {
          return await file.async('text');
        }
        return null;
      };

      console.log('ZipLoader patched successfully!');
    }
  }, 50);

  // 超时检查
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 10000);
})();



