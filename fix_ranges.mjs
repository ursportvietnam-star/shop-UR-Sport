import fs from 'fs';
import path from 'path';

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix escapeHtmlAttr in AddBlogPostModal
  content = content.replace(
    `const escapeHtmlAttr = (value: string) =>\n    value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');`,
    `const escapeHtmlAttr = (value: string) =>\n    value ? value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';`
  );

  content = content.replace(
    /const range = quill\.getSelection\(true\);(?!\s*const insertIndex)/g,
    `const range = quill.getSelection(true);\n        const insertIndex = range?.index ?? quill.getLength();`
  );

  content = content.replace(/range\.index/g, 'insertIndex');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Fixed', filePath);
}

fixFile(path.join(process.cwd(), 'src/components/AddBlogPostModal.tsx'));
fixFile(path.join(process.cwd(), 'src/components/AddProductModal.tsx'));
