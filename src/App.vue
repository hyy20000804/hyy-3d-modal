<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 根据当前路由动态计算按钮文字
const buttonText = computed(() => {
  if (route.path === '/cold' || route.path === '/three') {
    return '回到首页'
  } else if (route.path === '/') {
    return '去标签页'
  }
  return ''
})

// 点击按钮跳转
const handleButtonClick = () => {
  if (route.path === '/cold' || route.path === '/three') {
    router.push('/')
  } else if (route.path === '/') {
    router.push('/cold') // 或者你希望去的标签页路由
  }
}

onMounted(() => {
  const el = document.querySelector('.el-container')
  if (el) {
    el.style.backgroundImage = 'url(/src/assets/bg.webp)'
  }
})
</script>

<template>
  <el-container>
    <el-header class="header-bar">
      <img src="@/assets/blue.png" alt="Logo" class="logo" />
      <span class="title">智慧园区</span>
      <el-button
        v-if="buttonText"
        class="switch-btn"
        @click="handleButtonClick"
      >
        {{ buttonText }}
      </el-button>
    </el-header>

    <el-container>
      <el-main>
        <router-view></router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped lang="less">
.el-header {
  height: 30px;
}

.el-container {
  background: #04172e;
  // background-image: url('@/assets/bg.webp');
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center;
  height: 100vh;
}

.header-bar {
  display: flex;
  align-items: center;
}

.logo {
  width: 60px;
  height: 20px;
  margin-right: 20px;
}

.header-bar span {
  width: 110px;
  height: 29px;
  font-family: SourceHanSansSC, SourceHanSansSC;
  font-weight: bold;
  font-size: 20px;
  color: #ffffff;
  line-height: 29px;
  letter-spacing: 1px;
  text-align: left;
  font-style: normal;
}

.el-main {
  padding-top: 3px;
  padding-left: 0;
  padding-right: 0;
  position: relative;
  --el-main-padding: 0px;
  overflow: hidden;
}

.el-aside {
  width: auto;
}

.el-header {
  height: var(--hyy-headerHeight);
}

.switch-btn {
  padding: 6px 16px;
  border-radius: 10px;
  border: none;
  color: #fff;
  font-weight: 500;
  letter-spacing: 0.5px;
  cursor: pointer;

  /* 新渐变：与园区深色后台更搭 */
  background: linear-gradient(135deg, #fff, #1b5cff);

  /* 更柔和的阴影 */
  box-shadow: 0 3px 8px rgba(50, 120, 255, 0.25);

  transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;

  /* 鼠标悬浮 */
  &:hover {
    color: #fff;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(60, 140, 255, 0.35);
    background: linear-gradient(135deg, #1b5cff, #fff);
  }

  /* 按下 */
  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 10px rgba(30, 100, 255, 0.3);
  }
}
</style>
