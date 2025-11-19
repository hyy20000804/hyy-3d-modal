<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

const isIndex = ref(true)

const goToSecondary = () => {
  isIndex.value = !isIndex.value
  if (isIndex.value) {
    router.push('/')
  } else {
    router.push('/cold')
  }
}
</script>
<template>
  <el-container>
    <el-header class="header-bar">
      <img src="@/assets/blue.png" alt="Logo" class="logo" />
      <span class="title">智慧园区</span>
      <el-button class="switch-btn" @click="goToSecondary">
        {{ !isIndex ? '回到首页' : '去到标签页' }}
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
  background-image: url('@/assets/bg.webp');
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
