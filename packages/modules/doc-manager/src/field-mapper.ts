/**
 * 字段模糊匹配器
 *
 * 实现表头与预定义字段的模糊匹配：
 * - 包含匹配：表头包含字段名
 * - 关键词匹配：预定义关键词命中
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** 预定义字段定义 */
export interface PredefinedField {
  /** 字段唯一 ID（1-24） */
  id: number;
  /** 字段名称 */
  name: string;
  /** 匹配关键词（用于模糊匹配） */
  keywords: string[];
}

/** 匹配结果 */
export interface MatchResult {
  /** 预定义字段 ID */
  fieldId: number;
  /** 预定义字段名 */
  fieldName: string;
  /** 匹配到的表头列名 */
  headerName: string;
  /** 匹配分数（越高越可信） */
  score: number;
}

// ---------------------------------------------------------------------------
// 24 个预定义字段
// ---------------------------------------------------------------------------

export const PREDEFINED_FIELDS: PredefinedField[] = [
  { id: 1,  name: '系统信息',   keywords: ['系统', 'system', '平台', 'platform'] },
  { id: 2,  name: '产品编号',   keywords: ['产品编号', 'product_id', '产品代码', '货号', '物料编号', 'item_no'] },
  { id: 3,  name: '批次号',     keywords: ['批次号', 'batch', 'batch_no', 'lot', 'lot_no', '批号'] },
  { id: 4,  name: '生产日期',   keywords: ['生产日期', 'manufacture_date', '生产时间', '制造日期', 'prod_date'] },
  { id: 5,  name: '有效期',     keywords: ['有效期', 'expiry', 'expiry_date', '有效期至', '失效日期', '到期日'] },
  { id: 6,  name: '规格型号',   keywords: ['规格型号', '规格', '型号', 'specification', 'model', 'spec'] },
  { id: 7,  name: '数量',       keywords: ['数量', 'quantity', 'qty', 'amount', 'count', '件数'] },
  { id: 8,  name: '单位',       keywords: ['单位', 'unit', '计量单位'] },
  { id: 9,  name: '供应商',     keywords: ['供应商', 'supplier', 'vendor', '供货商', '厂商'] },
  { id: 10, name: '检验员',     keywords: ['检验员', 'inspector', '质检员', '检验人', '检测员'] },
  { id: 11, name: '检验日期',   keywords: ['检验日期', 'inspection_date', '检测日期', '检查日期', '质检日期'] },
  { id: 12, name: '检验结果',   keywords: ['检验结果', 'inspection_result', '检测结果', '检查结果', '质检结果', 'result'] },
  { id: 13, name: '不合格项',   keywords: ['不合格项', 'nonconformity', '缺陷', 'defect', '不良', '不合格'] },
  { id: 14, name: '处置方式',   keywords: ['处置方式', 'disposition', '处理方式', '处理', '处置'] },
  { id: 15, name: '备注',       keywords: ['备注', 'remark', 'note', '说明', 'memo', '注释'] },
  { id: 16, name: '文件编号',   keywords: ['文件编号', 'document_id', '文档编号', '编号', 'file_no', 'doc_no'] },
  { id: 17, name: '版本号',     keywords: ['版本号', 'version', '版本', 'rev', 'revision'] },
  { id: 18, name: '密级',       keywords: ['密级', 'security_level', '保密等级', '机密', 'secret', 'classification'] },
  { id: 19, name: '归档日期',   keywords: ['归档日期', 'archive_date', '归档时间', '存档日期'] },
  { id: 20, name: '保管期限',   keywords: ['保管期限', 'retention', '保存期限', '保管期', '存档期限'] },
  { id: 21, name: '存储位置',   keywords: ['存储位置', 'storage_location', '存放位置', '存放地点', '位置', 'location'] },
  { id: 22, name: '关联文档',   keywords: ['关联文档', 'related_doc', '关联文件', '参考文档', '引用文件'] },
  { id: 23, name: '审批人',     keywords: ['审批人', 'approver', '审核人', '批准人', '签批人'] },
  { id: 24, name: '审批状态',   keywords: ['审批状态', 'approval_status', '审核状态', '批准状态', 'status'] },
];

// ---------------------------------------------------------------------------
// matchHeaders - 表头模糊匹配
// ---------------------------------------------------------------------------

/**
 * 将 Excel 表头与预定义字段进行模糊匹配
 *
 * 匹配策略：
 * 1. 精确匹配（header === field.name || header === keyword）→ score 100
 * 2. 包含匹配（header 包含 keyword 或 keyword 包含 header）→ score 80
 * 3. 清理后匹配（去除空格、下划线后做包含）→ score 60
 *
 * @param headers - Excel 表头数组
 * @param selectedFieldIds - 用户选择的字段 ID 列表（空表示全部）
 * @returns 匹配结果数组
 */
export function matchHeaders(
  headers: string[],
  selectedFieldIds: number[],
): MatchResult[] {
  const results: MatchResult[] = [];

  // 过滤出用户选择的字段
  const fields = selectedFieldIds.length === 0
    ? PREDEFINED_FIELDS
    : PREDEFINED_FIELDS.filter((f) => selectedFieldIds.includes(f.id));

  for (const header of headers) {
    const headerLower = header.toLowerCase().trim();
    const headerClean = headerLower.replace(/[\s_-]+/g, '');

    for (const field of fields) {
      let score = 0;

      // 策略 1：精确匹配
      if (
        headerLower === field.name.toLowerCase() ||
        field.keywords.some((kw) => headerLower === kw.toLowerCase())
      ) {
        score = 100;
      }
      // 策略 2：包含匹配
      else if (
        field.keywords.some((kw) => {
          const kwl = kw.toLowerCase();
          return headerLower.includes(kwl) || kwl.includes(headerLower);
        })
      ) {
        score = 80;
      }
      // 策略 3：清理后匹配
      else if (
        field.keywords.some((kw) => {
          const kwClean = kw.toLowerCase().replace(/[\s_-]+/g, '');
          return (
            headerClean.includes(kwClean) || kwClean.includes(headerClean)
          );
        })
      ) {
        score = 60;
      }

      if (score > 0) {
        // 如果已有同一个 header-字段 的匹配结果，保留最高分
        const existing = results.find(
          (r) => r.fieldId === field.id && r.headerName === header,
        );
        if (!existing) {
          results.push({
            fieldId: field.id,
            fieldName: field.name,
            headerName: header,
            score,
          });
        } else if (score > existing.score) {
          existing.score = score;
        }
      }
    }
  }

  // 按分数降序排列
  results.sort((a, b) => b.score - a.score);

  return results;
}
