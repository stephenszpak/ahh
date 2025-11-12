declare module 'jscodeshift' {
  export interface FileInfo {
    path: string;
    source: string;
  }

  export interface API {
    jscodeshift: any;
    stats?: (str: string) => void;
    report?: (str: string) => void;
  }

  const jscodeshift: any;
  export default jscodeshift;
}

