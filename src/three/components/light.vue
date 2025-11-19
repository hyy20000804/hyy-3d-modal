<template>
  <transition name="fade">
    <div v-if="visible" class="label-panel">
      <div class="header">
        <span>标签样式设置</span>
        <div class="btn-group">
          <!-- 🗑 清空按钮 -->
          <!-- <div class="clear-btn" @click="confirmRemoveAll">
						<el-icon><Delete /></el-icon>
					</div> -->
          <!-- 👁️ 显示/隐藏按钮 -->
          <div class="toggle-btn" @click="toggleLabels">
            <el-icon>{{ labelsVisible ? '👁️' : '❌' }}</el-icon>
          </div>
          <!-- ❌ 关闭面板按钮 -->
          <div class="close-btn" @click="close">
            <el-icon><Close /></el-icon>
          </div>
        </div>
      </div>

      <div class="body">
        <div class="control">
          <span>字体颜色：</span>
          <input type="color" v-model="color" @input="applyStyle" />
        </div>

        <div class="control">
          <span>字体大小：</span>
          <input
            type="range"
            min="10"
            max="30"
            v-model="fontSize"
            @input="applyStyle"
          />
          <span>{{ fontSize }}px</span>
        </div>

        <div class="control">
          <span>背景颜色：</span>
          <input type="color" v-model="bgColor" @input="applyStyle" />
        </div>

        <div class="control">
          <span>背景大小：</span>
          <input
            type="range"
            min="0"
            max="20"
            v-model="bgPadding"
            @input="applyStyle"
          />
          <span>{{ bgPadding }}px</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Close, Delete } from '@element-plus/icons-vue'

const visible = ref(false)
const color = ref('#ffffff')
const fontSize = ref(14)
const bgColor = ref('#000000')
const bgPadding = ref(4)

// 保存 CSS2DObject 标签
const labels = ref([])

// 标签显示状态
const labelsVisible = ref(false)

// 面板控制
const open = () => {
  visible.value = true
}

const close = () => {
  visible.value = false
  requestAnimationFrame(() => {
    viewer.renderer.clearDepth()
    viewer.renderer.clear()
  })
}

// 应用样式到所有标签
const applyStyle = () => {
  labels.value.forEach(label => {
    if (label.element) {
      label.element.style.color = color.value
      label.element.style.fontSize = fontSize.value + 'px'
      label.element.style.backgroundColor = bgColor.value
      label.element.style.padding = bgPadding.value + 'px 8px'
      label.element.style.borderRadius = '4px'
    }
  })
}

// 隐藏/显示标签
const hideAllLabels = () => {
  labels.value.forEach(label => {
    if (label.element) {
      label.element.style.visibility = 'hidden'
    }
  })
  labelsVisible.value = false
}

const showAllLabels = () => {
  labels.value.forEach(label => {
    if (label.element) {
      label.element.style.visibility = 'visible'
    }
  })
  labelsVisible.value = true
}

const toggleLabels = () => {
  labelsVisible.value ? hideAllLabels() : showAllLabels()
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

// 暴露给父组件
defineExpose({
  open,
  close,
  visible,
  labels,
  removeAllLabels,
  hideAllLabels,
  showAllLabels,
  toggleLabels
})
</script>

<style scoped lang="less">
.label-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  width: max-content;
  min-width: 220px;
  background: rgba(15, 20, 40, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 10px 16px;
  color: #fff;
  z-index: 10000;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.4);

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 14px;

    .btn-group {
      display: flex;
      gap: 6px;
    }

    .close-btn,
    .clear-btn,
    .toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #ffffff;
      cursor: pointer;
      transition: all 0.25s ease;
      box-shadow: 0 0 5px rgba(255, 255, 255, 0.4);

      i {
        color: #333;
        font-size: 14px;
      }

      &:hover {
        transform: rotate(90deg);
        background: var(--hyy-color);
        i {
          color: #fff;
        }
      }
    }
  }

  .control {
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;

    input[type='color'] {
      cursor: pointer;
      width: 36px;
      height: 22px;
      padding: 0;
      border: none;
      background: transparent;
    }

    input[type='range'] {
      flex: 1;
      margin: 0 6px;
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
</style>
