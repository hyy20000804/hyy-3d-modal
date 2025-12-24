<template>
  <transition name="fade">
    <div v-if="visible" class="label-panel">
      <div class="header">
        <span>标签样式设置</span>
        <div class="btn-group">
          <!-- 重置按钮 -->
          <div class="reset-btn" @click="resetToDefault" title="重置为默认值">
            <el-icon><Refresh /></el-icon>
          </div>
          <!-- 显示/隐藏按钮 -->
          <div
            class="toggle-btn"
            @click="toggleLabels"
            :title="labelsVisible ? '隐藏标签' : '显示标签'"
          >
            <el-icon>
              <View v-if="labelsVisible" />
              <Hide v-else />
            </el-icon>
          </div>
          <!-- 关闭面板按钮 -->
          <div class="close-btn" @click="close" title="关闭">
            <el-icon><Close /></el-icon>
          </div>
        </div>
      </div>

      <div class="body">
        <div class="control">
          <span>字体颜色：</span>
          <div class="color-input-group">
            <input type="color" v-model="color" @input="applyAndSave" />
            <span class="color-value">{{ color }}</span>
          </div>
        </div>

        <div class="control">
          <span>字体大小：</span>
          <div class="range-input-group">
            <input
              type="range"
              min="10"
              max="30"
              v-model="fontSize"
              @input="applyAndSave"
            />
            <span class="value-display">{{ fontSize }}px</span>
          </div>
        </div>

        <div class="control">
          <span>背景颜色：</span>
          <div class="color-input-group">
            <input type="color" v-model="bgColor" @input="applyAndSave" />
            <span class="color-value">{{ bgColor }}</span>
          </div>
        </div>

        <div class="control">
          <span>背景大小：</span>
          <div class="range-input-group">
            <input
              type="range"
              min="0"
              max="20"
              v-model="bgPadding"
              @input="applyAndSave"
            />
            <span class="value-display">{{ bgPadding }}px</span>
          </div>
        </div>

        <!-- 存储状态提示 -->
        <div
          class="save-status"
          :class="{
            saved: saveStatus === 'saved',
            saving: saveStatus === 'saving'
          }"
        >
          {{ saveMessage }}
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Close, Delete, Refresh, View, Hide } from '@element-plus/icons-vue'

const visible = ref(false)

// 默认样式值
const defaultStyle = {
  color: '#ffffff',
  fontSize: 16,
  bgColor: '#000000',
  bgPadding: 0,
  labelsVisible: true // 添加标签显示状态默认值
}

// 响应式样式值
const color = ref(defaultStyle.color)
const fontSize = ref(defaultStyle.fontSize)
const bgColor = ref(defaultStyle.bgColor)
const bgPadding = ref(defaultStyle.bgPadding)

// 存储状态
const saveStatus = ref('idle') // idle, saving, saved, error
const saveMessage = ref('')

// 本地存储键名
const STORAGE_KEY = 'label-style-settings'

// 保存 CSS2DObject 标签
const labels = ref([])

// 标签显示状态 - 从默认值中获取
const labelsVisible = ref(defaultStyle.labelsVisible)

// 组件挂载时从本地存储加载设置
onMounted(() => {
  loadFromLocalStorage()
})

// 监听样式变化，延迟保存（防抖）
let saveTimeout = null
watch([color, fontSize, bgColor, bgPadding, labelsVisible], () => {
  if (saveTimeout) clearTimeout(saveTimeout)

  saveStatus.value = 'saving'
  saveMessage.value = '保存中...'

  saveTimeout = setTimeout(() => {
    saveToLocalStorage()
  }, 500)
})

// 从本地存储加载设置
function loadFromLocalStorage () {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)

      // 验证并应用保存的值
      if (isValidColor(parsed.color)) color.value = parsed.color
      if (isValidNumber(parsed.fontSize, 10, 30))
        fontSize.value = parsed.fontSize
      if (isValidColor(parsed.bgColor)) bgColor.value = parsed.bgColor
      if (isValidNumber(parsed.bgPadding, 0, 20))
        bgPadding.value = parsed.bgPadding

      // 加载标签显示状态
      if (typeof parsed.labelsVisible === 'boolean') {
        labelsVisible.value = parsed.labelsVisible
      }

      console.log('从本地存储加载样式设置:', parsed)
      showSaveStatus('已加载保存的设置', 'saved')

      // 加载后立即应用样式
      setTimeout(() => applyStyle(), 100)

      // 根据保存的显示状态应用标签可见性
      setTimeout(() => {
        if (labelsVisible.value) {
          showAllLabels()
        } else {
          hideAllLabels()
        }
      }, 150)
    } else {
      console.log('未找到保存的设置，使用默认值')
      resetToDefault(false) // 不显示消息
    }
  } catch (error) {
    console.error('加载本地存储失败:', error)
    resetToDefault(false) // 不显示消息
    showSaveStatus('加载失败，使用默认值', 'error')
  }
}

// 保存到本地存储
function saveToLocalStorage () {
  try {
    const settings = {
      color: color.value,
      fontSize: parseInt(fontSize.value),
      bgColor: bgColor.value,
      bgPadding: parseInt(bgPadding.value),
      labelsVisible: labelsVisible.value, // 保存标签显示状态
      lastModified: new Date().toISOString()
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    console.log('保存样式设置到本地存储:', settings)

    showSaveStatus('设置已保存', 'saved')
  } catch (error) {
    console.error('保存到本地存储失败:', error)
    showSaveStatus('保存失败', 'error')
  }
}

// 应用并保存样式
function applyAndSave () {
  applyStyle()
  saveToLocalStorage()
}

// 重置为默认值
function resetToDefault (showMessage = true) {
  color.value = defaultStyle.color
  fontSize.value = defaultStyle.fontSize
  bgColor.value = defaultStyle.bgColor
  bgPadding.value = defaultStyle.bgPadding
  labelsVisible.value = defaultStyle.labelsVisible

  applyStyle()
  // 应用标签可见性
  if (labelsVisible.value) {
    showAllLabels()
  } else {
    hideAllLabels()
  }
  saveToLocalStorage()

  if (showMessage) {
    ElMessage.success('已重置为默认设置')
  }
}

// 验证颜色值
function isValidColor (color) {
  if (!color) return false
  // 检查是否为有效的十六进制颜色或RGB颜色
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  const rgbRegex = /^rgb\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\)$/
  return hexRegex.test(color) || rgbRegex.test(color)
}

// 验证数字范围
function isValidNumber (value, min, max) {
  const num = parseInt(value)
  return !isNaN(num) && num >= min && num <= max
}

// 显示保存状态
function showSaveStatus (message, status = 'saved') {
  saveStatus.value = status
  saveMessage.value = message

  if (status === 'saved') {
    setTimeout(() => {
      saveStatus.value = 'idle'
      saveMessage.value = ''
    }, 2000)
  } else if (status === 'error') {
    setTimeout(() => {
      saveStatus.value = 'idle'
      saveMessage.value = ''
    }, 3000)
  }
}

// 面板控制
const open = () => {
  visible.value = true
}

const close = () => {
  visible.value = false
}

// 获取标签的实际内容元素
const getLabelContentElement = label => {
  // 如果标签有自定义的用户数据，使用它
  if (label.userData && label.userData.innerElement) {
    return label.userData.innerElement
  }

  // 否则尝试通过选择器查找
  if (label.element) {
    return (
      label.element.querySelector('.model-label-inner') ||
      label.element.querySelector('[data-label-content="true"]') ||
      label.element
    )
  }

  return null
}

// 应用样式到所有标签
const applyStyle = () => {
  labels.value.forEach(label => {
    const contentElement = getLabelContentElement(label)
    if (contentElement) {
      contentElement.style.color = color.value
      contentElement.style.fontSize = fontSize.value + 'px'
      contentElement.style.backgroundColor = bgColor.value
      contentElement.style.padding = bgPadding.value + 'px 8px'
      contentElement.style.borderRadius = '4px'
    }
  })
}

// 应用样式到单个标签
const applyStyleToLabel = label => {
  const contentElement = getLabelContentElement(label)
  if (contentElement) {
    contentElement.style.color = color.value
    contentElement.style.fontSize = fontSize.value + 'px'
    contentElement.style.backgroundColor = bgColor.value
    contentElement.style.padding = bgPadding.value + 'px 8px'
    contentElement.style.borderRadius = '4px'
    // 应用当前显示状态
    contentElement.style.visibility = labelsVisible.value ? 'visible' : 'hidden'
  }
}

// 隐藏所有标签
const hideAllLabels = () => {
  labelsVisible.value = false
  labels.value.forEach(label => {
    const contentElement = getLabelContentElement(label)
    if (contentElement) {
      contentElement.style.visibility = 'hidden'
    }
  })
}

// 显示所有标签
const showAllLabels = () => {
  labelsVisible.value = true
  labels.value.forEach(label => {
    const contentElement = getLabelContentElement(label)
    if (contentElement) {
      contentElement.style.visibility = 'visible'
    }
  })
}

// 添加标签到列表
const addLabel = label => {
  labels.value.push(label)
  // 立即应用当前样式和显示状态
  applyStyleToLabel(label)
}

// 切换标签显示状态
const toggleLabels = () => {
  if (labelsVisible.value) {
    hideAllLabels()
  } else {
    showAllLabels()
  }
  // 不在这里调用 saveToLocalStorage，因为 hideAllLabels/showAllLabels 会修改 labelsVisible，watch 会监听到
}

// 清空标签（彻底删除）
const removeAllLabels = () => {
  if (!labels.value.length) {
    ElMessage.info('暂无标签')
    return
  }
  labels.value.forEach(label => {
    if (label.parent) label.parent.remove(label)
  })
  labels.value = []
  labelsVisible.value = false
  ElMessage.success('已清空所有标签')
}

// 确认清空
const confirmRemoveAll = () => {
  ElMessageBox.confirm('确定要清空所有标签吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => removeAllLabels())
    .catch(() => {})
}

// 获取当前样式设置
const getCurrentStyle = () => {
  return {
    color: color.value,
    fontSize: fontSize.value,
    bgColor: bgColor.value,
    bgPadding: bgPadding.value,
    labelsVisible: labelsVisible.value
  }
}

// 移除标签
const removeLabel = label => {
  const index = labels.value.indexOf(label)
  if (index > -1) {
    labels.value.splice(index, 1)
  }
}

// 暴露给父组件
defineExpose({
  open,
  close,
  visible,
  labels,
  removeAllLabels,
  hideAllLabels,
  showAllLabels,
  toggleLabels,
  applyStyle,
  applyStyleToLabel,
  getCurrentStyle,
  addLabel,
  removeLabel
})
</script>

<style scoped lang="less">
.label-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  width: max-content;
  min-width: 240px;
  background: rgba(15, 20, 40, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px 14px;
  color: #fff;
  z-index: 10000;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    font-size: 14px;
    font-weight: 500;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 8px;

    .btn-group {
      display: flex;
      gap: 8px;
    }

    .close-btn,
    .reset-btn,
    .toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      cursor: pointer;
      transition: all 0.25s ease;
      border: 1px solid rgba(255, 255, 255, 0.2);

      &:hover {
        transform: scale(1.1);
        background: var(--hyy-color);
        border-color: var(--hyy-color);

        i {
          color: #fff;
        }
      }

      i {
        color: #fff;
        font-size: 14px;
      }
    }
  }

  .body {
    .control {
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;

      &:last-child {
        margin-bottom: 10px;
      }

      .color-input-group,
      .range-input-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      input[type='color'] {
        cursor: pointer;
        width: 40px;
        height: 24px;
        padding: 0;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 4px;
        background: transparent;
        transition: border-color 0.2s;

        &:hover {
          border-color: var(--hyy-color);
        }
      }

      .color-value {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.7);
        background: rgba(0, 0, 0, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
        min-width: 60px;
        text-align: center;
      }

      input[type='range'] {
        flex: 1;
        margin: 0 8px;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        outline: none;
        -webkit-appearance: none;

        &::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--hyy-color);
          cursor: pointer;
        }

        &::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--hyy-color);
          cursor: pointer;
          border: none;
        }
      }

      .value-display {
        min-width: 40px;
        text-align: center;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.9);
        background: rgba(0, 0, 0, 0.3);
        padding: 2px 6px;
        border-radius: 4px;
      }
    }

    .save-status {
      margin-top: 10px;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 11px;
      text-align: center;
      transition: all 0.3s;
      opacity: 0.8;

      &.saved {
        background: rgba(76, 175, 80, 0.2);
        color: #4caf50;
        border: 1px solid rgba(76, 175, 80, 0.3);
      }

      &.saving {
        background: rgba(33, 150, 243, 0.2);
        color: #2196f3;
        border: 1px solid rgba(33, 150, 243, 0.3);
      }

      &.error {
        background: rgba(244, 67, 54, 0.2);
        color: #f44336;
        border: 1px solid rgba(244, 67, 54, 0.3);
      }
    }
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.custom-range {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;
  margin: 0 8px;
}

/* WebKit 浏览器（Chrome, Safari, Edge）滑块样式 */
.custom-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3f63f3;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 0 5px rgba(63, 99, 243, 0.5);
  transition: all 0.2s ease;
}

.custom-range::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 0 8px rgba(63, 99, 243, 0.8);
}

.custom-range::-webkit-slider-thumb:active {
  transform: scale(1.05);
  box-shadow: 0 0 10px rgba(63, 99, 243, 1);
}

/* Firefox 滑块样式 */
.custom-range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3f63f3;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 0 5px rgba(63, 99, 243, 0.5);
  transition: all 0.2s ease;
}

.custom-range::-moz-range-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 0 8px rgba(63, 99, 243, 0.8);
}

/* Edge 滑块样式 */
.custom-range::-ms-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3f63f3;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 0 5px rgba(63, 99, 243, 0.5);
  transition: all 0.2s ease;
}

.custom-range::-ms-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 0 8px rgba(63, 99, 243, 0.8);
}

/* 进度条填充效果（可选） */
.custom-range::-webkit-slider-runnable-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.custom-range::-moz-range-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.custom-range::-ms-track {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

/* 如果希望有进度填充效果，可以添加以下样式 */
.custom-range::-webkit-slider-runnable-track {
  background: linear-gradient(
    to right,
    rgba(63, 99, 243, 0.3) 0%,
    rgba(63, 99, 243, 0.3)
      calc((var(--value) - var(--min)) / (var(--max) - var(--min)) * 100%),
    rgba(255, 255, 255, 0.1)
      calc((var(--value) - var(--min)) / (var(--max) - var(--min)) * 100%),
    rgba(255, 255, 255, 0.1) 100%
  );
}

/* 移除原来的 input[type='range'] 样式 */
.range-input-group input[type='range'] {
  flex: 1;
  margin: 0 8px;
  height: 6px;
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

/* 确保滑块样式不会冲突 */
.range-input-group input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3f63f3;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 0 5px rgba(63, 99, 243, 0.5);
}

.range-input-group input[type='range']::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3f63f3;
  cursor: pointer;
  border: 2px solid #ffffff;
  box-shadow: 0 0 5px rgba(63, 99, 243, 0.5);
}
</style>
