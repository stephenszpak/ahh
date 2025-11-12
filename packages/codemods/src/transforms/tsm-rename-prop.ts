import { Project, SyntaxKind } from 'ts-morph';

// Renames JSX prop dangerouslySetInnerHTML -> html (example)
export default function tsmRenameProp(source: string, fileName = 'file.tsx') {
  const project = new Project({ useInMemoryFileSystem: true, skipAddingFilesFromTsConfig: true });
  const file = project.createSourceFile(fileName, source, { overwrite: true });
  const jsxAttrs = file.getDescendantsOfKind(SyntaxKind.JsxAttribute);
  for (const attr of jsxAttrs) {
    const nameNode = attr.getNameNode();
    if (nameNode.getText() === 'dangerouslySetInnerHTML') {
      nameNode.replaceWithText('html');
    }
  }
  return file.getFullText();
}
