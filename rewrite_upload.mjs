import fs from 'fs';
import path from 'path';

function rewriteAddBlogPostModal() {
  const filePath = path.join(process.cwd(), 'src/components/AddBlogPostModal.tsx');
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/\r\n/g, '\n'); // Normalize newlines

  const oldCode = `  const uploadFile = async (file: File, resourceType: 'image' | 'video') => {
    setUploading(true);
    setUploadProgress(0);
    return new Promise<string>((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', \`blog/\${resourceType}\`);

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        setUploading(false);
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url);
        } else {
          reject(new Error('Upload thất bại, kiểm tra cấu hình Cloudinary.'));
        }
      };
      xhr.onerror = () => {
        setUploading(false);
        reject(new Error('Lỗi tải lên. Vui lòng thử lại.'));
      };
      xhr.open('POST', \`https://api.cloudinary.com/v1_1/\${CLOUDINARY_CLOUD_NAME}/\${resourceType}/upload\`);
      xhr.send(formData);
    });
  };

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh hợp lệ cho ảnh đại diện.');
      return;
    }
    try {
      const url = await uploadFile(file, 'image');
      setCoverImage(url);
      toast.success('Ảnh đại diện đã được tải lên.');
    } catch (error: any) {
      toast.error(error.message || 'Lỗi upload ảnh đại diện');
    }
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        if (type === 'image' && !file.type.startsWith('image/')) {
          toast.error('Vui lòng chọn file ảnh hợp lệ.');
          continue;
        }
        if (type === 'video' && !file.type.startsWith('video/')) {
          toast.error('Vui lòng chọn file video hợp lệ.');
          continue;
        }
        const url = await uploadFile(file, type);
        urls.push(url);
        toast.success(\`\${type === 'image' ? 'Ảnh' : 'Video'} đã được tải lên.\`);
      }
      if (type === 'image') {
        setImageUrls((prev) => [...prev, ...urls]);
      } else {
        setVideoUrls((prev) => [...prev, ...urls]);
      }
    } catch (error: any) {
      toast.error(error.message || 'Lỗi upload file');
    }
  };`;

  const newCode = `  const uploadFile = async (file: File, resourceType: 'image' | 'video') => {
    setUploading(true);
    setUploadProgress(10);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('folder', \`blog/\${resourceType}\`);

      const res = await fetch(\`https://api.cloudinary.com/v1_1/\${CLOUDINARY_CLOUD_NAME}/\${resourceType}/upload\`, {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error?.message || \`Upload thất bại: \${res.statusText}\`);
      }
      return data.secure_url;
    } catch (error: any) {
      console.error('Upload error:', error);
      throw new Error(error.message === 'Failed to fetch' ? 'Lỗi kết nối mạng. Vui lòng thử lại.' : (error.message || 'Lỗi tải lên. Vui lòng thử lại.'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh hợp lệ cho ảnh đại diện.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File quá lớn! Tối đa 10MB.');
      return;
    }
    try {
      const url = await uploadFile(file, 'image');
      setCoverImage(url);
      toast.success('Ảnh đại diện đã được tải lên.');
    } catch (error: any) {
      toast.error(error.message || 'Lỗi upload ảnh đại diện');
    }
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        if (type === 'image' && !file.type.startsWith('image/')) {
          toast.error('Vui lòng chọn file ảnh hợp lệ.');
          continue;
        }
        if (type === 'video' && !file.type.startsWith('video/')) {
          toast.error('Vui lòng chọn file video hợp lệ.');
          continue;
        }
        if (file.size > (type === 'video' ? 100 : 10) * 1024 * 1024) {
          toast.error(\`File quá lớn! Tối đa \${type === 'video' ? '100MB' : '10MB'}.\`);
          continue;
        }
        const url = await uploadFile(file, type);
        urls.push(url);
        toast.success(\`\${type === 'image' ? 'Ảnh' : 'Video'} đã được tải lên.\`);
      }
      if (type === 'image') {
        setImageUrls((prev) => [...prev, ...urls]);
      } else {
        setVideoUrls((prev) => [...prev, ...urls]);
      }
    } catch (error: any) {
      toast.error(error.message || 'Lỗi upload file');
    }
  };`;

  if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    console.log('Successfully replaced functions in AddBlogPostModal.tsx');
  } else {
    console.log('Could not find oldCode in AddBlogPostModal.tsx!');
  }

  // Use simple string replacement for escapeHtmlAttr
  const oldEscapeHtmlAttr = "const escapeHtmlAttr = (value: string) =>\n    value.replace(/&/g, '&amp;').replace(/\"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');";
  const newEscapeHtmlAttr = "const escapeHtmlAttr = (value: string) =>\n    value ? value.replace(/&/g, '&amp;').replace(/\"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';";
  content = content.replace(oldEscapeHtmlAttr, newEscapeHtmlAttr);

  fs.writeFileSync(filePath, content, 'utf8');
}

rewriteAddBlogPostModal();
