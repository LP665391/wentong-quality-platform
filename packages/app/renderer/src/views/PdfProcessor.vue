<template>
  <div class="module-page">
    <div class="page-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div>
        <h2>📄 PDF处理</h2>
        <p class="page-desc">合并、拆分、加密、水印、质检、页码、图片转PDF，一站式 PDF 文档处理</p>
      </div>
      <el-button size="small" @click="showGuide = true">📖 使用说明</el-button>
    </div>

    <div class="wt-card">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- ============================================================ -->
        <!-- 合并 Tab                                                       -->
        <!-- ============================================================ -->
        <el-tab-pane label="📑 合并" name="merge">
          <el-form label-width="100px" label-position="left">
            <el-form-item label="选择文件">
              <div class="input-with-btn">
                <el-input
                  v-model="mergeFileListText"
                  placeholder="请选择要合并的 PDF 文件（可多选）"
                  readonly
                />
                <el-button type="primary" @click="selectMergeFiles" :disabled="processing">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <!-- 文件排序列表 -->
            <el-form-item v-if="mergeFiles.length > 0" label="文件顺序">
              <div class="file-order-list">
                <div
                  v-for="(file, idx) in mergeFiles"
                  :key="idx"
                  class="file-order-item"
                >
                  <span class="file-index">{{ idx + 1 }}</span>
                  <span class="file-name">{{ file }}</span>
                  <el-button
                    type="danger"
                    :icon="Delete"
                    circle
                    size="small"
                    @click="removeMergeFile(idx)"
                  />
                  <el-button
                    v-if="idx > 0"
                    :icon="Top"
                    circle
                    size="small"
                    @click="moveMergeFile(idx, idx - 1)"
                  />
                  <el-button
                    v-if="idx < mergeFiles.length - 1"
                    :icon="Bottom"
                    circle
                    size="small"
                    @click="moveMergeFile(idx, idx + 1)"
                  />
                </div>
              </div>
            </el-form-item>

            <el-form-item label="输出路径">
              <div class="input-with-btn">
                <el-input v-model="mergeOutput" placeholder="合并后的 PDF 输出路径" />
                <el-button @click="selectMergeOutput" :disabled="processing">浏览</el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="!canMerge || processing"
                :loading="processing && activeAction === 'merge'"
                @click="doMerge"
              >
                {{ processing && activeAction === 'merge' ? '合并中...' : '开始合并' }}
              </el-button>
            </el-form-item>

            <!-- 进度 -->
            <el-form-item v-if="showProgress && activeAction === 'merge'">
              <el-progress
                :percentage="progressPercent"
                :stroke-width="16"
                :text-inside="true"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- ============================================================ -->
        <!-- 拆分 Tab                                                       -->
        <!-- ============================================================ -->
        <el-tab-pane label="✂️ 拆分" name="split">
          <el-form label-width="100px" label-position="left">
            <el-form-item label="选择文件">
              <div class="input-with-btn">
                <el-input v-model="splitFilePath" placeholder="请选择要拆分的 PDF 文件" readonly />
                <el-button type="primary" @click="selectSplitFile" :disabled="processing">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <el-form-item label="拆分模式">
              <el-radio-group v-model="splitMode" :disabled="processing">
                <el-radio value="pages">每 N 页拆分为一个文件</el-radio>
                <el-radio value="range">按页码范围拆分</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item v-if="splitMode === 'pages'" label="每份页数">
              <el-input-number
                v-model="splitPagesPerPart"
                :min="1"
                :max="999"
                :disabled="processing"
              />
            </el-form-item>

            <el-form-item v-if="splitMode === 'range'" label="页码范围">
              <div class="range-list">
                <div
                  v-for="(range, idx) in splitRanges"
                  :key="idx"
                  class="range-item"
                >
                  <span>第</span>
                  <el-input-number
                    v-model="range.start"
                    :min="1"
                    size="small"
                    style="width: 100px"
                    :disabled="processing"
                  />
                  <span>页 — 第</span>
                  <el-input-number
                    v-model="range.end"
                    :min="1"
                    size="small"
                    style="width: 100px"
                    :disabled="processing"
                  />
                  <span>页</span>
                  <el-button
                    type="danger"
                    :icon="Delete"
                    circle
                    size="small"
                    @click="splitRanges.splice(idx, 1)"
                    :disabled="processing"
                  />
                </div>
                <el-button
                  type="primary"
                  :icon="Plus"
                  size="small"
                  @click="splitRanges.push({ start: 1, end: 1 })"
                  :disabled="processing"
                >
                  添加范围
                </el-button>
              </div>
            </el-form-item>

            <el-form-item label="输出目录">
              <div class="input-with-btn">
                <el-input v-model="splitOutputDir" placeholder="拆分文件输出目录" readonly />
                <el-button @click="selectSplitOutputDir" :disabled="processing">浏览</el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="!canSplit || processing"
                :loading="processing && activeAction === 'split'"
                @click="doSplit"
              >
                {{ processing && activeAction === 'split' ? '拆分中...' : '开始拆分' }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- ============================================================ -->
        <!-- 加密 Tab                                                       -->
        <!-- ============================================================ -->
        <el-tab-pane label="🔒 加密" name="encrypt">
          <el-form label-width="100px" label-position="left">
            <el-form-item label="选择文件">
              <div class="input-with-btn">
                <el-input
                  v-model="encryptFileListText"
                  placeholder="请选择要加密的 PDF 文件（可多选）"
                  readonly
                />
                <el-button type="primary" @click="selectEncryptFiles" :disabled="processing">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <el-form-item v-if="encryptFiles.length > 0" label="已选文件">
              <el-tag size="large" style="margin-right: 8px">{{ encryptFiles.length }} 个文件</el-tag>
              <el-button size="small" type="danger" plain @click="encryptFiles = []; encryptFileStatuses = {}">清空</el-button>
            </el-form-item>

            <el-form-item label="用户密码">
              <el-input
                v-model="encryptPassword"
                type="password"
                placeholder="打开文档所需的密码"
                show-password
                :disabled="processing"
              />
            </el-form-item>

            <el-form-item label="所有者密码">
              <el-input
                v-model="encryptOwnerPassword"
                type="password"
                placeholder="修改权限所需密码（留空则同用户密码）"
                show-password
                :disabled="processing"
              />
            </el-form-item>

            <el-form-item label="权限设置">
              <el-checkbox-group v-model="encryptPermissions" :disabled="processing">
                <el-checkbox value="print" label="允许打印" />
                <el-checkbox value="modify" label="允许修改" />
                <el-checkbox value="copy" label="允许复制" />
              </el-checkbox-group>
            </el-form-item>

            <el-form-item label="输出目录">
              <div class="input-with-btn">
                <el-input v-model="encryptOutputDir" placeholder="加密后的 PDF 输出目录" readonly />
                <el-button @click="selectEncryptOutputDir" :disabled="processing">浏览</el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="!canEncrypt || processing"
                :loading="processing && activeAction === 'encrypt'"
                @click="doEncrypt"
              >
                {{ processing && activeAction === 'encrypt' ? '批量加密中...' : '批量加密' }}
              </el-button>
            </el-form-item>

            <!-- 批量进度 -->
            <el-form-item v-if="showProgress && activeAction === 'encrypt'">
              <div class="batch-progress-info">
                <span>正在处理: {{ batchProgress.currentFile }}/{{ batchProgress.totalFiles }} — {{ batchProgress.fileName }}</span>
                <span class="batch-result-summary">
                  ✅ {{ batchProgress.successCount }} / ❌ {{ batchProgress.failCount }}
                </span>
              </div>
              <el-progress
                :percentage="progressPercent"
                :stroke-width="16"
                :text-inside="true"
              />
            </el-form-item>

            <!-- 解密区域 -->
            <el-divider content-position="left">解密</el-divider>

            <el-form-item label="加密文件">
              <div class="input-with-btn">
                <el-input
                  v-model="decryptFileListText"
                  placeholder="请选择要解密的 PDF 文件（可多选）"
                  readonly
                />
                <el-button type="primary" @click="selectDecryptFiles" :disabled="processing">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <!-- 解密文件列表 -->
            <el-form-item v-if="decryptFiles.length > 0" label="已选文件">
              <el-tag size="large" style="margin-right: 8px">{{ decryptFiles.length }} 个文件</el-tag>
              <el-button size="small" type="danger" plain @click="decryptFiles = []; decryptFileStatuses = {}">清空</el-button>
            </el-form-item>

            <el-form-item label="密码">
              <el-input
                v-model="decryptPassword"
                type="password"
                placeholder="输入解密密码"
                show-password
                :disabled="processing"
              />
            </el-form-item>

            <el-form-item label="输出目录">
              <div class="input-with-btn">
                <el-input v-model="decryptOutputDir" placeholder="解密后的 PDF 输出目录" readonly />
                <el-button @click="selectDecryptOutputDir" :disabled="processing">浏览</el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="!canDecrypt || processing"
                :loading="processing && activeAction === 'decrypt'"
                @click="doDecrypt"
              >
                {{ processing && activeAction === 'decrypt' ? '批量解密中...' : '批量解密' }}
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- ============================================================ -->
        <!-- 水印 Tab                                                       -->
        <!-- ============================================================ -->
        <el-tab-pane label="💧 水印" name="watermark">
          <el-form label-width="100px" label-position="left">
            <el-form-item label="选择文件">
              <div class="input-with-btn">
                <el-input
                  v-model="watermarkFileListText"
                  placeholder="请选择要添加水印的 PDF 文件（可多选）"
                  readonly
                />
                <el-button type="primary" @click="selectWatermarkFiles" :disabled="processing">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <!-- 文件列表 -->
            <el-form-item v-if="watermarkFiles.length > 0" label="已选文件">
              <el-tag size="large" style="margin-right: 8px">{{ watermarkFiles.length }} 个文件</el-tag>
              <el-button size="small" type="danger" plain @click="watermarkFiles = []; watermarkFileStatuses = {}">清空</el-button>
            </el-form-item>

            <el-form-item label="水印文字">
              <el-input
                v-model="watermarkText"
                placeholder="请输入水印文字内容"
                :disabled="processing"
              />
            </el-form-item>

            <el-form-item label="位置">
              <el-select v-model="watermarkPosition" :disabled="processing" style="width: 180px">
                <el-option label="居中" value="center" />
                <el-option label="左上角" value="top-left" />
                <el-option label="右上角" value="top-right" />
                <el-option label="左下角" value="bottom-left" />
                <el-option label="右下角" value="bottom-right" />
              </el-select>
            </el-form-item>

            <el-form-item label="透明度">
              <el-slider
                v-model="watermarkOpacity"
                :min="0.05"
                :max="1"
                :step="0.05"
                :disabled="processing"
                :format-tooltip="(v: number) => `${Math.round(v * 100)}%`"
                style="width: 300px"
              />
            </el-form-item>

            <el-form-item label="旋转角度">
              <el-input-number
                v-model="watermarkRotation"
                :min="0"
                :max="360"
                :disabled="processing"
              />
              <span style="margin-left: 8px; color: #999">度</span>
            </el-form-item>

            <el-form-item label="水印大小">
              <el-input-number
                v-model="watermarkFontSize"
                :min="12"
                :max="300"
                :disabled="processing"
              />
              <span style="margin-left: 8px; color: #999">pt（推荐 36~72）</span>
            </el-form-item>

            <el-form-item label="输出目录">
              <div class="input-with-btn">
                <el-input
                  v-model="watermarkOutputDir"
                  placeholder="带水印的 PDF 输出目录"
                  readonly
                />
                <el-button @click="selectWatermarkOutputDir" :disabled="processing">浏览</el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="!canWatermark || processing"
                :loading="processing && activeAction === 'watermark'"
                @click="doWatermark"
              >
                {{ processing && activeAction === 'watermark' ? '批量添加中...' : '批量添加水印' }}
              </el-button>
            </el-form-item>

            <!-- 批量进度 -->
            <el-form-item v-if="showProgress && activeAction === 'watermark'">
              <div class="batch-progress-info">
                <span>正在处理: {{ batchProgress.currentFile }}/{{ batchProgress.totalFiles }} — {{ batchProgress.fileName }}</span>
                <span class="batch-result-summary">
                  ✅ {{ batchProgress.successCount }} / ❌ {{ batchProgress.failCount }}
                </span>
              </div>
              <el-progress
                :percentage="progressPercent"
                :stroke-width="16"
                :text-inside="true"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- ============================================================ -->
        <!-- 质检 Tab                                                       -->
        <!-- ============================================================ -->
        <el-tab-pane label="🔍 质检" name="quality">
          <el-form label-width="100px" label-position="left">
            <el-form-item label="选择文件">
              <div class="input-with-btn">
                <el-input
                  v-model="qualityFileListText"
                  placeholder="请选择要质检的 PDF 文件（可多选）"
                  readonly
                />
                <el-button type="primary" @click="selectQualityFiles" :disabled="processing">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <!-- 文件列表 -->
            <el-form-item v-if="qualityFiles.length > 0" label="已选文件">
              <el-tag size="large" style="margin-right: 8px">{{ qualityFiles.length }} 个文件</el-tag>
              <el-button size="small" type="danger" plain @click="qualityFiles = []; qualityFileStatuses = {}">清空</el-button>
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="qualityFiles.length === 0 || processing"
                :loading="processing && activeAction === 'quality'"
                @click="doQualityCheck"
              >
                {{ processing && activeAction === 'quality' ? '批量检查中...' : '批量质检' }}
              </el-button>
            </el-form-item>

            <!-- 批量进度 -->
            <el-form-item v-if="showProgress && activeAction === 'quality'">
              <div class="batch-progress-info">
                <span>正在处理: {{ batchProgress.currentFile }}/{{ batchProgress.totalFiles }} — {{ batchProgress.fileName }}</span>
                <span class="batch-result-summary">
                  ✅ {{ batchProgress.successCount }} / ❌ {{ batchProgress.failCount }}
                </span>
              </div>
              <el-progress
                :percentage="progressPercent"
                :stroke-width="16"
                :text-inside="true"
              />
            </el-form-item>

            <!-- 批量质检结果摘要 -->
            <div v-if="qualityResults.length > 0" class="quality-result">
              <el-divider content-position="left">质检结果摘要</el-divider>

              <el-alert
                :title="qualityAllPassed ? '✅ 全部通过' : '❌ 存在未通过项'"
                :type="qualityAllPassed ? 'success' : 'error'"
                :closable="false"
                show-icon
                style="margin-bottom: 16px"
              />

              <div class="quality-summary">
                <div class="summary-item">
                  <span class="label">总文件数：</span>
                  <span class="value">{{ qualityResults.length }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">通过：</span>
                  <span class="value" style="color: #67c23a">{{ qualityPassedCount }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">未通过：</span>
                  <span class="value" style="color: #f56c6c">{{ qualityFailedCount }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">总页数：</span>
                  <span class="value">{{ qualityTotalPages }}</span>
                </div>
              </div>

              <!-- 各文件结果（带分页和问题详情） -->
              <div style="margin-top: 16px">
                <div v-for="(result, idx) in paginatedQualityResults" :key="idx" style="margin-bottom: 8px; border: 1px solid #ebeef5; border-radius: 6px; overflow: hidden;">
                  <div
                    class="issue-item"
                    style="cursor: pointer; background: #fafafa;"
                    @click="toggleQualityDetail(idx)"
                  >
                    <el-tag :type="result.success && result.result?.passed ? 'success' : result.success ? 'warning' : 'danger'" size="small">
                      {{ result.success && result.result?.passed ? '通过' : result.success ? '有异常' : '失败' }}
                    </el-tag>
                    <span class="issue-message" style="font-weight: 500">{{ getFileName(result.file) }}</span>
                    <span class="issue-details">{{ result.result?.summary?.pageCount ?? '?' }} 页 | {{ result.result?.issues?.length ?? 0 }} 个问题</span>
                    <el-icon style="margin-left: auto; transition: transform .2s">
                      <ArrowDown v-if="qualityDetailIndex !== realIndex(result)" />
                      <ArrowUp v-else />
                    </el-icon>
                  </div>

                  <!-- 展开的详情 -->
                  <div v-if="qualityDetailIndex === realIndex(result)" style="padding: 12px 16px; border-top: 1px solid #ebeef5;">
                    <!-- 基本信息 -->
                    <div class="quality-summary" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 12px;">
                      <div class="summary-item">
                        <span class="label">页数：</span>
                        <span class="value">{{ result.result?.summary?.pageCount ?? '-' }}</span>
                      </div>
                      <div class="summary-item">
                        <span class="label">大小：</span>
                        <span class="value">{{ formatFileSize(result.result?.summary?.fileSize ?? 0) }}</span>
                      </div>
                      <div class="summary-item">
                        <span class="label">PDF/A：</span>
                        <span class="value">{{ result.result?.summary?.isPdfA ? '是' : '否' }}</span>
                      </div>
                      <div class="summary-item">
                        <span class="label">分辨率：</span>
                        <span class="value">{{ result.result?.summary?.resolution ? result.result?.summary?.resolution + ' DPI' : '未知' }}</span>
                      </div>
                    </div>

                    <!-- 问题列表 -->
                    <div v-if="result.result?.issues && result.result?.issues.length > 0" class="quality-issues" style="margin-top: 0;">
                      <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #f56c6c;">发现的问题：</h4>
                      <div v-for="(issue, i) in result.result?.issues" :key="i" class="issue-item" style="background: #fff; margin-bottom: 4px;">
                        <el-tag :type="issue.type === 'error' ? 'danger' : issue.type === 'warning' ? 'warning' : 'info'" size="small">
                          {{ issue.type === 'error' ? '错误' : issue.type === 'warning' ? '警告' : '提示' }}
                        </el-tag>
                        <span class="issue-message">{{ issue.message }}</span>
                        <span v-if="issue.details" class="issue-details">（{{ issue.details }}）</span>
                      </div>
                    </div>
                    <div v-else style="color: #67c23a; font-size: 13px;">✅ 无异常</div>
                  </div>
                </div>

                <!-- 分页 -->
                <el-pagination
                  v-if="qualityResults.length > qualityPageSize"
                  :current-page="qualityCurrentPage"
                  :page-size="qualityPageSize"
                  :total="qualityResults.length"
                  layout="prev, pager, next"
                  style="margin-top: 12px; justify-content: center;"
                  @current-change="qualityCurrentPage = $event"
                />
              </div>
            </div>
          </el-form>
        </el-tab-pane>

        <!-- ============================================================ -->
        <!-- 页码 Tab                                                       -->
        <!-- ============================================================ -->
        <el-tab-pane label="🔢 页码" name="pagenum">
          <el-form label-width="100px" label-position="left">
            <el-form-item label="选择文件">
              <div class="input-with-btn">
                <el-input
                  v-model="pageNumFileListText"
                  placeholder="请选择要添加页码的 PDF 文件（可多选）"
                  readonly
                />
                <el-button type="primary" @click="selectPageNumFiles" :disabled="processing">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <!-- 文件列表 -->
            <el-form-item v-if="pageNumFiles.length > 0" label="已选文件">
              <el-tag size="large" style="margin-right: 8px">{{ pageNumFiles.length }} 个文件</el-tag>
              <el-button size="small" type="danger" plain @click="pageNumFiles = []; pageNumFileStatuses = {}">清空</el-button>
            </el-form-item>

            <el-form-item label="起始页码">
              <el-input-number
                v-model="pageNumStart"
                :min="1"
                :max="9999"
                :disabled="processing"
              />
            </el-form-item>

            <el-form-item label="页码格式">
              <el-select v-model="pageNumFormat" :disabled="processing" style="width: 180px">
                <el-option label="阿拉伯数字 (1, 2, 3)" value="arabic" />
                <el-option label="罗马数字 (i, ii, iii)" value="roman" />
                <el-option label="带横线 (-1-, -2-, -3-)" value="dash" />
              </el-select>
            </el-form-item>

            <el-form-item label="位置">
              <el-select v-model="pageNumPosition" :disabled="processing" style="width: 180px">
                <el-option label="底部居中" value="bottom-center" />
                <el-option label="底部左侧" value="bottom-left" />
                <el-option label="底部右侧" value="bottom-right" />
              </el-select>
            </el-form-item>

            <el-form-item label="跳过前">
              <el-input-number
                v-model="pageNumSkip"
                :min="0"
                :max="100"
                :disabled="processing"
              />
              <span style="margin-left: 8px; color: #999">页（如封面）</span>
            </el-form-item>

            <el-form-item label="前缀/后缀">
              <el-input
                v-model="pageNumPrefix"
                placeholder="前缀，如：第"
                style="width: 120px; margin-right: 8px"
                :disabled="processing"
              />
              <el-input
                v-model="pageNumSuffix"
                placeholder="后缀，如：页"
                style="width: 120px"
                :disabled="processing"
              />
            </el-form-item>

            <el-form-item label="输出目录">
              <div class="input-with-btn">
                <el-input
                  v-model="pageNumOutputDir"
                  placeholder="带页码的 PDF 输出目录"
                  readonly
                />
                <el-button @click="selectPageNumOutputDir" :disabled="processing">浏览</el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="!canPageNum || processing"
                :loading="processing && activeAction === 'pagenum'"
                @click="doPageNum"
              >
                {{ processing && activeAction === 'pagenum' ? '批量添加中...' : '批量添加页码' }}
              </el-button>
            </el-form-item>

            <!-- 批量进度 -->
            <el-form-item v-if="showProgress && activeAction === 'pagenum'">
              <div class="batch-progress-info">
                <span>正在处理: {{ batchProgress.currentFile }}/{{ batchProgress.totalFiles }} — {{ batchProgress.fileName }}</span>
                <span class="batch-result-summary">
                  ✅ {{ batchProgress.successCount }} / ❌ {{ batchProgress.failCount }}
                </span>
              </div>
              <el-progress
                :percentage="progressPercent"
                :stroke-width="16"
                :text-inside="true"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- ============================================================ -->
        <!-- 图片转PDF Tab                                                  -->
        <!-- ============================================================ -->
        <el-tab-pane label="🖼️ 图片转PDF" name="img2pdf">
          <el-form label-width="100px" label-position="left">
            <el-form-item label="选择图片">
              <div class="input-with-btn">
                <el-input
                  v-model="img2pdfFileListText"
                  placeholder="请选择要转换的图片文件（可多选，支持 JPG/PNG）"
                  readonly
                />
                <el-button type="primary" @click="selectImg2pdfFiles" :disabled="processing">
                  浏览
                </el-button>
              </div>
            </el-form-item>

            <!-- 图片列表 -->
            <div v-if="img2pdfFiles.length > 0" class="file-order-list" style="margin-bottom: 16px">
              <div
                v-for="(file, idx) in img2pdfFiles"
                :key="idx"
                class="file-order-item"
              >
                <span class="file-index">{{ idx + 1 }}</span>
                <span class="file-name">{{ getFileName(file) }}</span>
                <el-button
                  type="danger"
                  :icon="Delete"
                  circle
                  size="small"
                  @click="removeImg2pdfFile(idx)"
                />
              </div>
            </div>

            <el-form-item label="页面尺寸">
              <el-select v-model="img2pdfPageSize" :disabled="processing" style="width: 180px">
                <el-option label="A4" value="A4" />
                <el-option label="Letter" value="Letter" />
                <el-option label="Legal" value="Legal" />
                <el-option label="自动（匹配图片）" value="auto" />
              </el-select>
            </el-form-item>

            <el-form-item label="页面方向">
              <el-select v-model="img2pdfOrientation" :disabled="processing" style="width: 180px">
                <el-option label="自动" value="auto" />
                <el-option label="纵向" value="portrait" />
                <el-option label="横向" value="landscape" />
              </el-select>
            </el-form-item>

            <el-form-item label="输出路径">
              <div class="input-with-btn">
                <el-input
                  v-model="img2pdfOutput"
                  placeholder="输出的 PDF 文件路径"
                />
                <el-button @click="selectImg2pdfOutput" :disabled="processing">浏览</el-button>
              </div>
            </el-form-item>

            <el-form-item>
              <el-button
                type="success"
                size="large"
                :disabled="!canImg2pdf || processing"
                :loading="processing && activeAction === 'img2pdf'"
                @click="doImg2pdf"
              >
                {{ processing && activeAction === 'img2pdf' ? '转换中...' : '开始转换' }}
              </el-button>
            </el-form-item>

            <!-- 进度 -->
            <el-form-item v-if="showProgress && activeAction === 'img2pdf'">
              <el-progress
                :percentage="progressPercent"
                :stroke-width="16"
                :text-inside="true"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
    <!-- 使用说明对话框 -->
    <el-dialog v-model="showGuide" title="📖 使用说明 — PDF处理" width="650px">
      <div style="line-height: 1.8; font-size: 14px; color: #303133; padding: 0 8px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">一、功能概述</h3>
        <p style="margin: 0 0 16px 0; color: #595959;">提供 7 大 PDF 处理功能（合并、拆分、加密/解密、水印、质检、页码、图片转PDF），一站式满足档案数字化场景需求。</p>

        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">二、操作步骤</h3>
        <ol style="margin: 0 0 16px 0; padding-left: 20px;">
          <li style="margin-bottom: 6px;"><strong>合并：</strong>选择多个 PDF → 调整顺序 → 设置输出路径 → 开始合并。</li>
          <li style="margin-bottom: 6px;"><strong>拆分：</strong>选择 PDF → 选择拆分模式（按页数/按范围）→ 设置输出目录 → 开始拆分。</li>
          <li style="margin-bottom: 6px;"><strong>加密/解密：</strong>选择 PDF → 设置密码和权限（打印/修改/复制）→ 设置输出目录 → 批量加密/解密。</li>
          <li style="margin-bottom: 6px;"><strong>水印：</strong>选择 PDF → 输入水印文字 → 设置位置、透明度、旋转角度 → 批量添加水印。</li>
          <li style="margin-bottom: 6px;"><strong>质检：</strong>选择 PDF → 批量质检，检测完整性、页数、可读性。</li>
          <li style="margin-bottom: 6px;"><strong>页码：</strong>选择 PDF → 设置起始页码和位置 → 批量添加页码。</li>
          <li style="margin-bottom: 6px;"><strong>图片转PDF：</strong>选择图片 → 设置纸张大小和页面方向 → 开始转换。</li>
        </ol>

        <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #1677ff;">三、常见问题</h3>
        <ul style="margin: 0 0 0 0; padding-left: 20px;">
          <li style="margin-bottom: 4px;">所有功能均支持<strong>批量处理</strong>，可一次选择多个文件</li>
          <li style="margin-bottom: 4px;">处理大文件时请耐心等待，进度条会实时显示处理状态</li>
          <li style="margin-bottom: 4px;">建议处理前先<strong>备份原文件</strong>，以免误操作</li>
        </ul>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElNotification } from 'element-plus';
import { useAppStore } from '@/stores/app';
import { useTaskStore } from '@/stores/task';
import { Delete, Top, Bottom, Plus, ArrowDown, ArrowUp } from '@element-plus/icons-vue';
import { COMPARISON_DATA, type ComparisonData } from '@/utils/demo-scenarios';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SplitRange {
  start: number;
  end: number;
}

// ---------------------------------------------------------------------------
// Common State
// ---------------------------------------------------------------------------

const activeTab = ref('merge');
const processing = ref(false);
const activeAction = ref('');
const showProgress = ref(false);
const showGuide = ref(false);
const appStore = useAppStore();
const taskStore = useTaskStore();

onMounted(() => {
  // 桌面版不自动加载演示数据
});
const progressPercent = ref(0);
const batchProgress = ref({
  currentFile: 0,
  totalFiles: 0,
  fileName: '',
  percent: 0,
  status: '',
  successCount: 0,
  failCount: 0,
});

// ---------------------------------------------------------------------------
// Merge State
// ---------------------------------------------------------------------------

const mergeFiles = ref<string[]>([]);
const mergeFileListText = ref('');
const mergeOutput = ref('');

const canMerge = computed(
  () => mergeFiles.value.length >= 2 && mergeOutput.value.trim().length > 0,
);

// ---------------------------------------------------------------------------
// Split State
// ---------------------------------------------------------------------------

const splitFilePath = ref('');
const splitMode = ref<'pages' | 'range'>('pages');
const splitPagesPerPart = ref(1);
const splitRanges = ref<SplitRange[]>([{ start: 1, end: 1 }]);
const splitOutputDir = ref('');

const canSplit = computed(() => {
  if (!splitFilePath.value || !splitOutputDir.value) return false;
  if (splitMode.value === 'pages') return splitPagesPerPart.value >= 1;
  return splitRanges.value.length > 0;
});

// ---------------------------------------------------------------------------
// Encrypt State
// ---------------------------------------------------------------------------

const encryptFiles = ref<string[]>([]);
const encryptFileListText = ref('');
const encryptFileStatuses = ref<Record<number, string>>({});
const encryptPassword = ref('');
const encryptOwnerPassword = ref('');
const encryptPermissions = ref<string[]>([]);
const encryptOutputDir = ref('');

const canEncrypt = computed(
  () =>
    encryptFiles.value.length > 0 &&
    encryptPassword.value.length > 0 &&
    encryptOutputDir.value.length > 0,
);

// Decrypt
const decryptFiles = ref<string[]>([]);
const decryptFileListText = ref('');
const decryptFileStatuses = ref<Record<number, string>>({});
const decryptPassword = ref('');
const decryptOutputDir = ref('');

const canDecrypt = computed(
  () =>
    decryptFiles.value.length > 0 &&
    decryptPassword.value.length > 0 &&
    decryptOutputDir.value.length > 0,
);

// ---------------------------------------------------------------------------
// Watermark State
// ---------------------------------------------------------------------------

const watermarkFiles = ref<string[]>([]);
const watermarkFileListText = ref('');
const watermarkFileStatuses = ref<Record<number, string>>({});
const watermarkText = ref('');
const watermarkPosition = ref<'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('center');
const watermarkOpacity = ref(0.3);
const watermarkRotation = ref(45);
const watermarkFontSize = ref(48);
const watermarkOutputDir = ref('');

const canWatermark = computed(
  () =>
    watermarkFiles.value.length > 0 &&
    watermarkText.value.length > 0 &&
    watermarkOutputDir.value.length > 0,
);

// ---------------------------------------------------------------------------
// Quality Check State
// ---------------------------------------------------------------------------

const qualityFiles = ref<string[]>([]);
const qualityFileListText = ref('');
const qualityFileStatuses = ref<Record<number, string>>({});
const qualityResults = ref<any[]>([]);
const qualityResult = ref<any>(null);

const qualityAllPassed = computed(() =>
  qualityResults.value.length > 0 && qualityResults.value.every((r: any) => r.result?.passed),
);
const qualityPassedCount = computed(() =>
  qualityResults.value.filter((r: any) => r.result?.passed).length,
);
const qualityFailedCount = computed(() =>
  qualityResults.value.filter((r: any) => !r.result?.passed).length,
);
const qualityTotalPages = computed(() =>
  qualityResults.value.reduce((sum: number, r: any) => sum + (r.result?.summary?.pageCount ?? 0), 0),
);

// 质检结果分页与详情
const qualityCurrentPage = ref(1);
const qualityPageSize = 5;
const qualityDetailIndex = ref<number | null>(null);
const paginatedQualityResults = computed(() => {
  const start = (qualityCurrentPage.value - 1) * qualityPageSize;
  return qualityResults.value.slice(start, start + qualityPageSize);
});

function toggleQualityDetail(idx: number) {
  const realIdx = (qualityCurrentPage.value - 1) * qualityPageSize + idx;
  qualityDetailIndex.value = qualityDetailIndex.value === realIdx ? null : realIdx;
}

function realIndex(result: any) {
  return qualityResults.value.indexOf(result);
}

// ---------------------------------------------------------------------------
// Page Number State
// ---------------------------------------------------------------------------

const pageNumFiles = ref<string[]>([]);
const pageNumFileListText = ref('');
const pageNumFileStatuses = ref<Record<number, string>>({});
const pageNumStart = ref(1);
const pageNumFormat = ref<'arabic' | 'roman' | 'dash'>('arabic');
const pageNumPosition = ref<'bottom-center' | 'bottom-left' | 'bottom-right'>('bottom-center');
const pageNumSkip = ref(0);
const pageNumPrefix = ref('');
const pageNumSuffix = ref('');
const pageNumOutputDir = ref('');

const canPageNum = computed(
  () =>
    pageNumFiles.value.length > 0 &&
    pageNumOutputDir.value.length > 0,
);

// ---------------------------------------------------------------------------
// Image to PDF State
// ---------------------------------------------------------------------------

const img2pdfFiles = ref<string[]>([]);
const img2pdfFileListText = ref('');
const img2pdfPageSize = ref<'A4' | 'Letter' | 'Legal' | 'auto'>('A4');
const img2pdfOrientation = ref<'portrait' | 'landscape' | 'auto'>('auto');
const img2pdfOutput = ref('');

const canImg2pdf = computed(
  () =>
    img2pdfFiles.value.length > 0 &&
    img2pdfOutput.value.length > 0,
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApi() {
  return (window as any).electronAPI;
}

function getFileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() ?? filePath;
}

// ---------------------------------------------------------------------------
// Merge Actions
// ---------------------------------------------------------------------------

async function selectMergeFiles(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) {
    ElMessage.warning('文件选择功能仅在桌面应用中可用');
    return;
  }
  try {
    const files: string[] = await api.selectFile({
      filters: [
        { name: 'PDF 文件', extensions: ['pdf'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    });
    if (files && files.length > 0) {
      mergeFiles.value = [...mergeFiles.value, ...files];
      mergeFileListText.value = mergeFiles.value.join('; ');
      // 自动设置输出路径
      if (!mergeOutput.value) {
        const first = files[0];
        const dir = first.substring(0, first.lastIndexOf('/') !== -1 ? first.lastIndexOf('/') : first.lastIndexOf('\\'));
        mergeOutput.value = `${dir}/merged.pdf`;
      }
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

function removeMergeFile(idx: number): void {
  mergeFiles.value.splice(idx, 1);
  mergeFileListText.value = mergeFiles.value.join('; ');
}

function moveMergeFile(from: number, to: number): void {
  const item = mergeFiles.value.splice(from, 1)[0];
  if (item) {
    mergeFiles.value.splice(to, 0, item);
    mergeFileListText.value = mergeFiles.value.join('; ');
  }
}

async function selectMergeOutput(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) {
    ElMessage.warning('目录选择功能仅在桌面应用中可用');
    return;
  }
  try {
    const dir: string = await api.selectDirectory();
    if (dir) {
      mergeOutput.value = `${dir}/merged.pdf`;
    }
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function doMerge(): Promise<void> {
  if (!canMerge.value) return;
  const api = getApi();
  if (!api?.mergePdf) {
    ElMessage.warning('PDF 处理功能仅在桌面应用中可用');
    return;
  }

  processing.value = true;
  activeAction.value = 'merge';
  showProgress.value = true;
  progressPercent.value = 0;

  try {
    // 监听进度
    let cleanup: (() => void) | null = null;
    if (api.onPdfProgress) {
      cleanup = api.onPdfProgress((data: { percent: number }) => {
        progressPercent.value = data.percent;
      });
    }

    const res = await api.mergePdf({
      filePaths: [...mergeFiles.value],
      outputPath: mergeOutput.value,
    });

    if (cleanup) cleanup();

    if (res.success) {
      ElNotification({
        title: '合并完成',
        message: `已生成 ${res.result.totalPages} 页 PDF → ${getFileName(mergeOutput.value)}`,
        type: 'success',
        duration: 5000,
      });
      taskStore.addTask({ name: `PDF合并 - ${mergeFiles.value.length}个文件`, module: 'PDF处理', status: 'completed' });
    } else {
      ElNotification({
        title: '合并失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
      taskStore.addTask({ name: `PDF合并 - ${mergeFiles.value.length}个文件`, module: 'PDF处理', status: 'failed', error: res.error ?? '未知错误' });
    }
  } catch (err: any) {
    ElNotification({
      title: '合并异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    processing.value = false;
    activeAction.value = '';
    showProgress.value = false;
  }
}

// ---------------------------------------------------------------------------
// Split Actions
// ---------------------------------------------------------------------------

async function selectSplitFile(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) return;
  try {
    const files: string[] = await api.selectFile({
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
    });
    if (files && files.length > 0) {
      splitFilePath.value = files[0];
      if (!splitOutputDir.value) {
        const dir = files[0].substring(0, files[0].lastIndexOf('/') !== -1 ? files[0].lastIndexOf('/') : files[0].lastIndexOf('\\'));
        splitOutputDir.value = `${dir}/split-output`;
      }
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

async function selectSplitOutputDir(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) return;
  try {
    const dir: string = await api.selectDirectory();
    if (dir) splitOutputDir.value = dir;
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function doSplit(): Promise<void> {
  if (!canSplit.value) return;
  const api = getApi();
  if (!api?.splitPdf) {
    ElMessage.warning('PDF 处理功能仅在桌面应用中可用');
    return;
  }

  processing.value = true;
  activeAction.value = 'split';

    const options =
      splitMode.value === 'pages'
        ? { mode: 'pages' as const, pagesPerPart: splitPagesPerPart.value }
        : { mode: 'range' as const, ranges: splitRanges.value.map(r => ({ ...r })) };

  try {
    const res = await api.splitPdf({
      filePath: splitFilePath.value,
      outputDir: splitOutputDir.value,
      options,
    });

    if (res.success) {
      ElNotification({
        title: '拆分完成',
        message: `已生成 ${res.outputPaths.length} 个文件`,
        type: 'success',
        duration: 5000,
      });
      taskStore.addTask({ name: `PDF拆分 - ${getFileName(splitFilePath.value)}`, module: 'PDF处理', status: 'completed' });
    } else {
      ElNotification({
        title: '拆分失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
      taskStore.addTask({ name: `PDF拆分 - ${getFileName(splitFilePath.value)}`, module: 'PDF处理', status: 'failed', error: res.error ?? '未知错误' });
    }
  } catch (err: any) {
    ElNotification({
      title: '拆分异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    processing.value = false;
    activeAction.value = '';
  }
}

// ---------------------------------------------------------------------------
// Encrypt / Decrypt Actions
// ---------------------------------------------------------------------------

async function selectEncryptFiles(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) return;
  try {
    const files: string[] = await api.selectFile({
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (files && files.length > 0) {
      encryptFiles.value = [...encryptFiles.value, ...files];
      encryptFileListText.value = encryptFiles.value.map(f => getFileName(f)).join('; ');
      if (!encryptOutputDir.value) {
        const first = files[0];
        const dir = first.substring(0, first.lastIndexOf('/') !== -1 ? first.lastIndexOf('/') : first.lastIndexOf('\\'));
        encryptOutputDir.value = `${dir}/encrypted-output`;
      }
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

function removeEncryptFile(idx: number): void {
  encryptFiles.value.splice(idx, 1);
  encryptFileListText.value = encryptFiles.value.map(f => getFileName(f)).join('; ');
  delete encryptFileStatuses.value[idx];
}

async function selectEncryptOutputDir(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) return;
  try {
    const dir: string = await api.selectDirectory();
    if (dir) encryptOutputDir.value = dir;
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function doEncrypt(): Promise<void> {
  if (!canEncrypt.value) return;
  const api = getApi();
  if (!api?.batchEncrypt) {
    ElMessage.warning('PDF 处理功能仅在桌面应用中可用');
    return;
  }

  processing.value = true;
  activeAction.value = 'encrypt';
  showProgress.value = true;
  progressPercent.value = 0;
  encryptFileStatuses.value = {};
  batchProgress.value = { currentFile: 0, totalFiles: encryptFiles.value.length, fileName: '', percent: 0, status: '', successCount: 0, failCount: 0 };

  try {
    let cleanup: (() => void) | null = null;
    if (api.onBatchProgress) {
      cleanup = api.onBatchProgress((data: { currentFile: number; totalFiles: number; fileName: string; percent: number; status: string; successCount: number; failCount: number }) => {
        batchProgress.value = { ...data };
        progressPercent.value = data.percent;
      });
    }

    const res = await api.batchEncrypt({
      filePaths: [...encryptFiles.value],
      outputDir: encryptOutputDir.value,
      options: {
        userPassword: encryptPassword.value,
        ownerPassword: encryptOwnerPassword.value || undefined,
        canPrint: encryptPermissions.value.includes('print'),
        canModify: encryptPermissions.value.includes('modify'),
        canCopy: encryptPermissions.value.includes('copy'),
      },
    });

    if (cleanup) cleanup();

    if (res.success) {
      // 更新每个文件状态
      if (res.results) {
        res.results.forEach((r: any, idx: number) => {
          encryptFileStatuses.value[idx] = r.success ? 'success' : 'fail';
        });
      }
      ElNotification({
        title: '批量加密完成',
        message: `成功 ${res.successCount ?? batchProgress.value.successCount} / 失败 ${res.failCount ?? batchProgress.value.failCount}`,
        type: res.failCount > 0 ? 'warning' : 'success',
        duration: 5000,
      });
      taskStore.addTask({ name: `PDF加密 - ${encryptFiles.value.length}个文件`, module: 'PDF处理', status: res.failCount > 0 ? 'completed' : 'completed' });
    } else {
      ElNotification({
        title: '批量加密失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
      taskStore.addTask({ name: `PDF加密 - ${encryptFiles.value.length}个文件`, module: 'PDF处理', status: 'failed', error: res.error ?? '未知错误' });
    }
  } catch (err: any) {
    ElNotification({
      title: '批量加密异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    processing.value = false;
    activeAction.value = '';
    showProgress.value = false;
  }
}

async function selectDecryptFiles(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) return;
  try {
    const files: string[] = await api.selectFile({
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (files && files.length > 0) {
      decryptFiles.value = [...decryptFiles.value, ...files];
      decryptFileListText.value = decryptFiles.value.map(f => getFileName(f)).join('; ');
      if (!decryptOutputDir.value) {
        const first = files[0];
        const dir = first.substring(0, first.lastIndexOf('/') !== -1 ? first.lastIndexOf('/') : first.lastIndexOf('\\'));
        decryptOutputDir.value = `${dir}/decrypted-output`;
      }
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

function removeDecryptFile(idx: number): void {
  decryptFiles.value.splice(idx, 1);
  decryptFileListText.value = decryptFiles.value.map(f => getFileName(f)).join('; ');
  delete decryptFileStatuses.value[idx];
}

async function selectDecryptOutputDir(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) return;
  try {
    const dir: string = await api.selectDirectory();
    if (dir) decryptOutputDir.value = dir;
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function doDecrypt(): Promise<void> {
  if (!canDecrypt.value) return;
  const api = getApi();
  if (!api?.decryptPdf) {
    ElMessage.warning('PDF 处理功能仅在桌面应用中可用');
    return;
  }

  processing.value = true;
  activeAction.value = 'decrypt';
  showProgress.value = true;
  progressPercent.value = 0;
  decryptFileStatuses.value = {};
  batchProgress.value = { currentFile: 0, totalFiles: decryptFiles.value.length, fileName: '', percent: 0, status: '', successCount: 0, failCount: 0 };

  try {
    let cleanup: (() => void) | null = null;
    if (api.onBatchProgress) {
      cleanup = api.onBatchProgress((data: { currentFile: number; totalFiles: number; fileName: string; percent: number; status: string; successCount: number; failCount: number }) => {
        batchProgress.value = { ...data };
        progressPercent.value = data.percent;
      });
    }

    // 逐个解密（如果后端不支持批量解密，则循环调用单文件解密）
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < decryptFiles.value.length; i++) {
      const filePath = decryptFiles.value[i];
      const outputPath = `${decryptOutputDir.value}/${getFileName(filePath).replace(/\.pdf$/i, '-decrypted.pdf')}`;

      batchProgress.value = {
        ...batchProgress.value,
        currentFile: i + 1,
        fileName: getFileName(filePath),
        percent: Math.round(((i) / decryptFiles.value.length) * 100),
      };
      progressPercent.value = batchProgress.value.percent;

      try {
        const res = await api.decryptPdf({
          filePath,
          password: decryptPassword.value,
          outputPath,
        });
        if (res.success) {
          decryptFileStatuses.value[i] = 'success';
          successCount++;
        } else {
          decryptFileStatuses.value[i] = 'fail';
          failCount++;
        }
      } catch {
        decryptFileStatuses.value[i] = 'fail';
        failCount++;
      }

      batchProgress.value = { ...batchProgress.value, successCount, failCount };
    }

    if (cleanup) cleanup();
    progressPercent.value = 100;

    ElNotification({
      title: '批量解密完成',
      message: `成功 ${successCount} / 失败 ${failCount}`,
      type: failCount > 0 ? 'warning' : 'success',
      duration: 5000,
    });
    taskStore.addTask({ name: `PDF解密 - ${decryptFiles.value.length}个文件`, module: 'PDF处理', status: failCount > 0 ? 'completed' : 'completed' });
  } catch (err: any) {
    ElNotification({
      title: '批量解密异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    processing.value = false;
    activeAction.value = '';
    showProgress.value = false;
  }
}

// ---------------------------------------------------------------------------
// Watermark Actions
// ---------------------------------------------------------------------------

async function selectWatermarkFiles(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) return;
  try {
    const files: string[] = await api.selectFile({
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (files && files.length > 0) {
      watermarkFiles.value = [...watermarkFiles.value, ...files];
      watermarkFileListText.value = watermarkFiles.value.map(f => getFileName(f)).join('; ');
      if (!watermarkOutputDir.value) {
        const first = files[0];
        const dir = first.substring(0, first.lastIndexOf('/') !== -1 ? first.lastIndexOf('/') : first.lastIndexOf('\\'));
        watermarkOutputDir.value = `${dir}/watermarked-output`;
      }
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

function removeWatermarkFile(idx: number): void {
  watermarkFiles.value.splice(idx, 1);
  watermarkFileListText.value = watermarkFiles.value.map(f => getFileName(f)).join('; ');
  delete watermarkFileStatuses.value[idx];
}

async function selectWatermarkOutputDir(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) return;
  try {
    const dir: string = await api.selectDirectory();
    if (dir) watermarkOutputDir.value = dir;
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function doWatermark(): Promise<void> {
  if (!canWatermark.value) return;
  const api = getApi();
  if (!api?.batchWatermark) {
    ElMessage.warning('PDF 处理功能仅在桌面应用中可用');
    return;
  }

  processing.value = true;
  activeAction.value = 'watermark';
  showProgress.value = true;
  progressPercent.value = 0;
  watermarkFileStatuses.value = {};
  batchProgress.value = { currentFile: 0, totalFiles: watermarkFiles.value.length, fileName: '', percent: 0, status: '', successCount: 0, failCount: 0 };

  try {
    let cleanup: (() => void) | null = null;
    if (api.onBatchProgress) {
      cleanup = api.onBatchProgress((data: { currentFile: number; totalFiles: number; fileName: string; percent: number; status: string; successCount: number; failCount: number }) => {
        batchProgress.value = { ...data };
        progressPercent.value = data.percent;
      });
    }

    const res = await api.batchWatermark({
      filePaths: [...watermarkFiles.value],
      outputDir: watermarkOutputDir.value,
      options: {
        text: watermarkText.value,
        position: watermarkPosition.value,
        opacity: watermarkOpacity.value,
        rotation: watermarkRotation.value,
        fontSize: watermarkFontSize.value,
      },
    });

    if (cleanup) cleanup();

    if (res.success) {
      if (res.results) {
        res.results.forEach((r: any, idx: number) => {
          watermarkFileStatuses.value[idx] = r.success ? 'success' : 'fail';
        });
      }
      ElNotification({
        title: '批量水印添加完成',
        message: `成功 ${res.successCount ?? batchProgress.value.successCount} / 失败 ${res.failCount ?? batchProgress.value.failCount}`,
        type: res.failCount > 0 ? 'warning' : 'success',
        duration: 5000,
      });
      taskStore.addTask({ name: `水印添加 - ${watermarkFiles.value.length}个文件`, module: 'PDF处理', status: 'completed' });
    } else {
      ElNotification({
        title: '批量水印添加失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
      taskStore.addTask({ name: `水印添加 - ${watermarkFiles.value.length}个文件`, module: 'PDF处理', status: 'failed', error: res.error ?? '未知错误' });
    }
  } catch (err: any) {
    ElNotification({
      title: '批量水印异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    processing.value = false;
    activeAction.value = '';
    showProgress.value = false;
  }
}

// ---------------------------------------------------------------------------
// Quality Check Actions
// ---------------------------------------------------------------------------

async function selectQualityFiles(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) return;
  try {
    const files: string[] = await api.selectFile({
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (files && files.length > 0) {
      qualityFiles.value = [...qualityFiles.value, ...files];
      qualityFileListText.value = qualityFiles.value.map(f => getFileName(f)).join('; ');
      qualityResults.value = [];
      qualityResult.value = null;
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

function removeQualityFile(idx: number): void {
  qualityFiles.value.splice(idx, 1);
  qualityFileListText.value = qualityFiles.value.map(f => getFileName(f)).join('; ');
  delete qualityFileStatuses.value[idx];
}

async function doQualityCheck(): Promise<void> {
  if (qualityFiles.value.length === 0) return;
  const api = getApi();
  if (!api?.batchQualityCheck) {
    ElMessage.warning('PDF 处理功能仅在桌面应用中可用');
    return;
  }

  processing.value = true;
  activeAction.value = 'quality';
  showProgress.value = true;
  progressPercent.value = 0;
  qualityFileStatuses.value = {};
  qualityResults.value = [];
  qualityResult.value = null;
  batchProgress.value = { currentFile: 0, totalFiles: qualityFiles.value.length, fileName: '', percent: 0, status: '', successCount: 0, failCount: 0 };

  try {
    let cleanup: (() => void) | null = null;
    if (api.onBatchProgress) {
      cleanup = api.onBatchProgress((data: { currentFile: number; totalFiles: number; fileName: string; percent: number; status: string; successCount: number; failCount: number }) => {
        batchProgress.value = { ...data };
        progressPercent.value = data.percent;
      });
    }

    const res = await api.batchQualityCheck({
      filePaths: [...qualityFiles.value],
    });

    if (cleanup) cleanup();

    if (res.success) {
      qualityResults.value = res.results ?? [];
      qualityCurrentPage.value = 1;
      qualityDetailIndex.value = null;
      // 更新每个文件状态
      qualityResults.value.forEach((r: any, idx: number) => {
        qualityFileStatuses.value[idx] = r.result?.passed ? 'success' : 'fail';
      });
      // 保留最后一个结果兼容原有展示
      if (qualityResults.value.length > 0) {
        qualityResult.value = qualityResults.value[qualityResults.value.length - 1].result;
      }

      const totalPassed = qualityResults.value.filter((r: any) => r.result?.passed).length;
      const totalFailed = qualityResults.value.length - totalPassed;

      ElNotification({
        title: '批量质检完成',
        message: `${qualityFiles.value.length} 个文件：通过 ${totalPassed}，未通过 ${totalFailed}`,
        type: totalFailed > 0 ? 'warning' : 'success',
        duration: 5000,
      });
      taskStore.addTask({ name: `PDF质检 - ${qualityFiles.value.length}个文件`, module: 'PDF处理', status: totalFailed > 0 ? 'completed' : 'completed' });
    } else {
      ElNotification({
        title: '批量质检失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
      taskStore.addTask({ name: `PDF质检 - ${qualityFiles.value.length}个文件`, module: 'PDF处理', status: 'failed', error: res.error ?? '未知错误' });
    }
  } catch (err: any) {
    ElNotification({
      title: '批量质检异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    processing.value = false;
    activeAction.value = '';
    showProgress.value = false;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ---------------------------------------------------------------------------
// Page Number Actions
// ---------------------------------------------------------------------------

async function selectPageNumFiles(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) return;
  try {
    const files: string[] = await api.selectFile({
      filters: [{ name: 'PDF 文件', extensions: ['pdf'] }],
      properties: ['openFile', 'multiSelections'],
    });
    if (files && files.length > 0) {
      pageNumFiles.value = [...pageNumFiles.value, ...files];
      pageNumFileListText.value = pageNumFiles.value.map(f => getFileName(f)).join('; ');
      if (!pageNumOutputDir.value) {
        const first = files[0];
        const dir = first.substring(0, first.lastIndexOf('/') !== -1 ? first.lastIndexOf('/') : first.lastIndexOf('\\'));
        pageNumOutputDir.value = `${dir}/numbered-output`;
      }
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

function removePageNumFile(idx: number): void {
  pageNumFiles.value.splice(idx, 1);
  pageNumFileListText.value = pageNumFiles.value.map(f => getFileName(f)).join('; ');
  delete pageNumFileStatuses.value[idx];
}

async function selectPageNumOutputDir(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) return;
  try {
    const dir: string = await api.selectDirectory();
    if (dir) pageNumOutputDir.value = dir;
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function doPageNum(): Promise<void> {
  if (!canPageNum.value) return;
  const api = getApi();
  if (!api?.batchPageNumber) {
    ElMessage.warning('PDF 处理功能仅在桌面应用中可用');
    return;
  }

  processing.value = true;
  activeAction.value = 'pagenum';
  showProgress.value = true;
  progressPercent.value = 0;
  pageNumFileStatuses.value = {};
  batchProgress.value = { currentFile: 0, totalFiles: pageNumFiles.value.length, fileName: '', percent: 0, status: '', successCount: 0, failCount: 0 };

  try {
    let cleanup: (() => void) | null = null;
    if (api.onBatchProgress) {
      cleanup = api.onBatchProgress((data: { currentFile: number; totalFiles: number; fileName: string; percent: number; status: string; successCount: number; failCount: number }) => {
        batchProgress.value = { ...data };
        progressPercent.value = data.percent;
      });
    }

    const res = await api.batchPageNumber({
      filePaths: [...pageNumFiles.value],
      outputDir: pageNumOutputDir.value,
      options: {
        startPage: pageNumStart.value,
        format: pageNumFormat.value,
        position: pageNumPosition.value,
        skipPages: pageNumSkip.value,
        prefix: pageNumPrefix.value || undefined,
        suffix: pageNumSuffix.value || undefined,
      },
    });

    if (cleanup) cleanup();

    if (res.success) {
      if (res.results) {
        res.results.forEach((r: any, idx: number) => {
          pageNumFileStatuses.value[idx] = r.success ? 'success' : 'fail';
        });
      }
      ElNotification({
        title: '批量页码添加完成',
        message: `成功 ${res.successCount ?? batchProgress.value.successCount} / 失败 ${res.failCount ?? batchProgress.value.failCount}`,
        type: res.failCount > 0 ? 'warning' : 'success',
        duration: 5000,
      });
      taskStore.addTask({ name: `页码添加 - ${pageNumFiles.value.length}个文件`, module: 'PDF处理', status: 'completed' });
    } else {
      ElNotification({
        title: '批量页码添加失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
      taskStore.addTask({ name: `页码添加 - ${pageNumFiles.value.length}个文件`, module: 'PDF处理', status: 'failed', error: res.error ?? '未知错误' });
    }
  } catch (err: any) {
    ElNotification({
      title: '批量页码添加异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    processing.value = false;
    activeAction.value = '';
    showProgress.value = false;
  }
}

// ---------------------------------------------------------------------------
// Image to PDF Actions
// ---------------------------------------------------------------------------

async function selectImg2pdfFiles(): Promise<void> {
  const api = getApi();
  if (!api?.selectFile) return;
  try {
    const files: string[] = await api.selectFile({
      filters: [
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
    });
    if (files && files.length > 0) {
      img2pdfFiles.value = [...img2pdfFiles.value, ...files];
      img2pdfFileListText.value = img2pdfFiles.value.map(f => getFileName(f)).join('; ');
      if (!img2pdfOutput.value) {
        const first = files[0];
        const dir = first.substring(0, first.lastIndexOf('/') !== -1 ? first.lastIndexOf('/') : first.lastIndexOf('\\'));
        img2pdfOutput.value = `${dir}/converted.pdf`;
      }
    }
  } catch (err: any) {
    ElMessage.error(`选择文件失败：${err.message ?? err}`);
  }
}

function removeImg2pdfFile(idx: number): void {
  img2pdfFiles.value.splice(idx, 1);
  img2pdfFileListText.value = img2pdfFiles.value.map(f => getFileName(f)).join('; ');
}

async function selectImg2pdfOutput(): Promise<void> {
  const api = getApi();
  if (!api?.selectDirectory) return;
  try {
    const dir: string = await api.selectDirectory();
    if (dir) img2pdfOutput.value = `${dir}/converted.pdf`;
  } catch (err: any) {
    ElMessage.error(`选择目录失败：${err.message ?? err}`);
  }
}

async function doImg2pdf(): Promise<void> {
  if (!canImg2pdf.value) return;
  const api = getApi();
  if (!api?.imagesToPdf) {
    ElMessage.warning('PDF 处理功能仅在桌面应用中可用');
    return;
  }

  processing.value = true;
  activeAction.value = 'img2pdf';
  showProgress.value = true;
  progressPercent.value = 0;

  try {
    let cleanup: (() => void) | null = null;
    if (api.onPdfProgress) {
      cleanup = api.onPdfProgress((data: { percent: number }) => {
        progressPercent.value = data.percent;
      });
    }

    const res = await api.imagesToPdf({
      imagePaths: [...img2pdfFiles.value],
      outputPath: img2pdfOutput.value,
      options: {
        pageSize: img2pdfPageSize.value,
        orientation: img2pdfOrientation.value,
      },
    });

    if (cleanup) cleanup();

    if (res.success) {
      ElNotification({
        title: '转换完成',
        message: `已将 ${img2pdfFiles.value.length} 张图片转换为 PDF → ${getFileName(img2pdfOutput.value)}`,
        type: 'success',
        duration: 5000,
      });
      taskStore.addTask({ name: `图片转PDF - ${img2pdfFiles.value.length}张图片`, module: 'PDF处理', status: 'completed' });
    } else {
      ElNotification({
        title: '转换失败',
        message: res.error ?? '未知错误',
        type: 'error',
        duration: 8000,
      });
      taskStore.addTask({ name: `图片转PDF - ${img2pdfFiles.value.length}张图片`, module: 'PDF处理', status: 'failed', error: res.error ?? '未知错误' });
    }
  } catch (err: any) {
    ElNotification({
      title: '转换异常',
      message: err.message ?? String(err),
      type: 'error',
      duration: 8000,
    });
  } finally {
    processing.value = false;
    activeAction.value = '';
    showProgress.value = false;
  }
}
</script>

<style scoped>
.module-page {
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 24px;
  color: #262626;
  margin-bottom: 8px;
}

.page-desc {
  font-size: 14px;
  color: #8c8c8c;
}

.wt-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.input-with-btn {
  display: flex;
  gap: 8px;
  width: 100%;
}

.input-with-btn .el-input {
  flex: 1;
}

.file-order-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.file-order-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #f5f7fa;
  border-radius: 6px;
  font-size: 13px;
}

.file-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: #409eff;
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  flex-shrink: 0;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #303133;
}

.range-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.range-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}

.quality-result {
  margin-top: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.quality-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.summary-item .label {
  color: #909399;
  min-width: 80px;
}

.summary-item .value {
  color: #303133;
  font-weight: 500;
}

.quality-issues h4 {
  font-size: 14px;
  color: #303133;
  margin-bottom: 12px;
}

.issue-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 13px;
}

.issue-message {
  color: #303133;
  flex: 1;
}

.issue-details {
  color: #909399;
  font-size: 12px;
}

.batch-progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}

.batch-result-summary {
  font-weight: 500;
  color: #303133;
}
</style>
