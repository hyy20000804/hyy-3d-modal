<template>
  <el-menu
    :default-active="activeIndex"
    class="el-menu-demo"
    mode="horizontal"
    @select="handleSelect"
    style="width: 380px"
  >
    <el-menu-item index="/index">3d</el-menu-item>
    <el-menu-item index="/monitor">监控</el-menu-item>
  </el-menu>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const activeIndex = ref('/index')

const handleSelect = (key: string, keyPath: string[]) => {
  console.log(key, keyPath)
  router.push(key)
}
</script>

<style scoped>
.el-menu-demo {
  user-select: none;
  background: #201893;
}

.el-menu--horizontal.el-menu {
  border-bottom: none;
}

.el-menu--horizontal .el-menu-item:not(.is-disabled):hover {
  background: #201893;
}
.el-menu--horizontal .el-menu-item:not(.is-disabled):focus {
  background: #201893;
}

.el-menu--horizontal > .el-menu-item {
  color: #fff;
}
</style>
