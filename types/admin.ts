/**
 * MDX 編輯後台相關型別定義
 */

/** MDX 檔案的 frontmatter 結構 */
export interface MdxFrontmatter {
  title: string;
  description: string;
}

/** 檔案列表中的單一檔案資訊 */
export interface MdxFileInfo {
  /** 相對路徑 slug，如 "getting-started/create-brand" */
  slug: string;
  /** 檔案標題（從 frontmatter 提取） */
  title: string;
  /** 檔案描述（從 frontmatter 提取） */
  description: string;
  /** 最後修改時間（ISO 格式） */
  lastModified: string;
}

/** 單一 MDX 檔案的完整內容 */
export interface MdxFileContent {
  /** 相對路徑 slug */
  slug: string;
  /** 完整 MDX 內容（包含 frontmatter） */
  content: string;
  /** 解析後的 frontmatter */
  frontmatter: MdxFrontmatter;
}

/** API 回應：檔案列表 */
export interface MdxListResponse {
  files: MdxFileInfo[];
}

/** API 回應：單一檔案 */
export interface MdxFileResponse {
  slug: string;
  content: string;
  frontmatter: MdxFrontmatter;
  /** GitHub Contents API SHA（用於更新 PUT） */
  sha?: string;
}

/** API 回應：寫入結果 */
export interface MdxWriteResponse {
  success: boolean;
  message: string;
  /** GitHub 回傳的新 SHA（成功時可能提供） */
  sha?: string;
}

/** API 錯誤回應 */
export interface ApiErrorResponse {
  error: string;
}
