<script setup>
import Menu from './components/Menu/menu.vue'
</script>
<template>
  <el-container>
    <el-header class="header-bar">
      <img src="@/assets/blue.png" alt="Logo" class="logo" />
      <span class="title">智慧园区</span>
    </el-header>

    <el-container>
      <el-main>
        <router-view></router-view>
      </el-main>
    </el-container>
  </el-container>
</template>
<style scoped>
.el-header {
  height: 30px;
}
.el-container {
  background: #04172e;

  background-image: url('@/assets/bg.webp');
  background-size: cover; /* 拉伸填满 */
  background-repeat: no-repeat; /* 不重复
*/
  background-position: center; /* 居中对齐 */

  height: calc(100vh);
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
  width: 232px;
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
  height: 72px;
}
</style>
