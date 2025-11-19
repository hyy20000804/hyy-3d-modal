<template>
  <div id="jindu-text-con" v-if="loadingShow">
    正在加载模型请稍等：<span id="jindu-text">{{ progressText }}</span>
    <div class="jindu-con">
      <div id="jindu" :style="{ width: progressText }"></div>
    </div>
  </div>

  <div
    id="container"
    ref="container"
    :style="{
      width: props.initialWidth,
      height: props.initialHeight,
      margin: '0 auto'
    }"
  >
    <i
      :class="['iconfont', isFull ? 'icon-suoxiao1' : 'icon-fangda1']"
      class="icon next-icon"
      @click="toggleFullScreen"
      title="缩放屏幕"
    ></i>

    <i
      :class="[
        'iconfont',
        timeText == '夜间模式' ? 'icon-taiyang1' : 'icon-yejian'
      ]"
      class="icon next-icon"
      style="margin-right: 2%"
      @click="onChangeTime"
      title="切换日/夜模式"
    ></i>

    <i
      :class="['iconfont', 'icon-biaoqian1']"
      class="icon next-icon"
      @click="colorHandle"
      style="margin-right: 4%"
      title="编辑标签"
    ></i>

    <i
      :class="['iconfont', 'icon-dengguang1']"
      class="icon next-icon"
      style="margin-right: 6%"
      @click="lightHandle"
      title="光照调节"
    ></i>

    <transition name="fade">
      <div class="spinner" v-if="loadingShow">
        <div class="rect1"></div>
        <div class="rect2"></div>
        <div class="rect3"></div>
        <div class="rect4"></div>
        <div class="rect5"></div>
      </div>
    </transition>

    <ColorSON ref="colorSON"></ColorSON>
  </div>
</template>

<script setup>
import { ref, onMounted, defineProps, onUnmounted, watch, computed } from 'vue'
import * as THREE from 'three'
import Viewer from '@/three/threeModules/Viewer'
import SkyBoxs from '@/three/threeModules/SkyBoxs'
import Lights from '@/three/threeModules/Lights'
import ModelLoader from '@/three/threeModules/ModelLoader'
import Labels from '@/three/threeModules/Labels'
import gsap from 'gsap'
import {
  CSS2DRenderer,
  CSS2DObject
} from 'three/examples/jsm/renderers/CSS2DRenderer.js'

import 'element-plus/dist/index.css'
import ColorSON from './components/color.vue'
const colorSON = ref(null)
const modelDialog = ref()

/**
 * 给指定 Mesh 名称添加可编辑 Tooltip
 * @param meshName - 目标 Mesh 名称
 * @param text - Tooltip 默认文字
 */

// 添加标签的函数
const addTooltipToMesh = (meshName, name, position = {}) => {
  console.log('addTooltipToMesh 被调用:', { meshName, position })

  const targetMesh = officeBuild.object.getObjectByName(meshName)
  if (!targetMesh) {
    console.warn(`未找到 mesh: ${meshName}`)
    return
  }

  // 外层容器（CSS2DObject 使用的节点）
  const labelDiv = document.createElement('div')
  labelDiv.className = 'model-label'
  labelDiv.style.pointerEvents = 'auto'

  // 内层真实内容（偏移写在这里）
  // 内层真实内容（添加特定类名）
  const innerDiv = document.createElement('div')
  innerDiv.className = 'model-label-inner' // 添加类名
  innerDiv.textContent = name
  innerDiv.style.fontWeight = 'bold'
  innerDiv.style.whiteSpace = 'nowrap'
  innerDiv.style.background = 'rgba(0,0,0,0.6)'
  innerDiv.style.color = '#fff'
  innerDiv.style.fontSize = '14px'
  innerDiv.style.padding = '4px 8px'
  innerDiv.style.borderRadius = '4px'
  innerDiv.style.pointerEvents = 'auto'

  // --- 偏移逻辑（写在 margin 上，100% 生效） ---
  if (position.top !== undefined) {
    innerDiv.style.marginTop =
      typeof position.top === 'number' ? `${position.top}px` : position.top
  }

  if (position.left !== undefined) {
    innerDiv.style.marginLeft =
      typeof position.left === 'number' ? `${position.left}px` : position.left
  }

  if (position.bottom !== undefined) {
    innerDiv.style.marginBottom =
      typeof position.bottom === 'number'
        ? `${position.bottom}px`
        : position.bottom
  }

  if (position.right !== undefined) {
    innerDiv.style.marginRight =
      typeof position.right === 'number'
        ? `${position.right}px`
        : position.right
  }

  labelDiv.appendChild(innerDiv)

  // 点击事件（不会重复触发）
  innerDiv.addEventListener('click', e => {
    e.stopPropagation()
    e.preventDefault()
    console.log('tooltip clicked')
    modelDialog.value?.open(name)
  })

  const label = new CSS2DObject(labelDiv)
  targetMesh.add(label)

  if (colorSON.value) colorSON.value.labels.push(label)
}

/**
 * 高亮指定模型节点（支持子节点独立颜色）
 * @param {THREE.Object3D} root 根模型对象
 * @param {string} targetName 目标节点名称 (如 'b045')
 * @param {string|number} color 高亮颜色 ('#ff0000' | 'red')
 * @param {boolean} highlight 是否开启高亮，false 则恢复
 * @param {string[]} excludeNames 可选，要排除不受影响的子节点名称
 */
const highlightModel = (
  root,
  targetName,
  color,
  highlight,
  excludeNames = []
) => {
  if (!root) return

  root.traverse(obj => {
    if (obj.name === targetName) {
      obj.traverse(subObj => {
        if (subObj.isMesh) {
          // ❗跳过指定子节点（如 D90_Chilled_Water_Plant_1182）
          if (excludeNames.includes(subObj.name)) return

          subObj.material = subObj.material.clone()

          if (highlight) {
            const exists = highlightedMeshes.find(h => h.mesh === subObj)
            if (!exists) {
              highlightedMeshes.push({
                mesh: subObj,
                originalColor: subObj.material.color.clone(),
                originalEmissive: subObj.material.emissive
                  ? subObj.material.emissive.clone()
                  : null
              })
            }
            subObj.material.color.set(color)
            if (subObj.material.emissive) subObj.material.emissive.set(color)
          } else {
            const info = highlightedMeshes.find(h => h.mesh === subObj)
            if (info) {
              subObj.material.color.copy(info.originalColor)
              if (info.originalEmissive)
                subObj.material.emissive.copy(info.originalEmissive)
              else subObj.material.emissive?.setHex(0x000000)
            }
          }
        }
      })
    }
  })
}

// =================== 高亮控制 ===================
const colorHandle = () => {
  isHighlighted.value = !isHighlighted.value

  if (colorSON.value.visible) {
    colorSON.value.close()
  } else {
    colorSON.value.open()
  }
}

const props = defineProps({
  initialWidth: String,
  initialHeight: String,
  modelUrl: String,
  azimuthDeg: Number, // 默认的方位角度
  Zoom: Number, // zoom越大,模型越小
  elevationDeg: Number // 默认的俯仰角度
})

let viewer = null
let officeBuild = null
let modelLoader = null
let labelIns = null // 标签实例
let skyBoxs = null
const progressText = ref('0%')
const progressBarShow = ref(true)
const isFull = ref(false)
const isActive = ref(false)
let raycaster = new THREE.Raycaster()
let mouse = new THREE.Vector2()
let selectedFloor = null // 当前抽离的楼层
let floorOriginalPos = new THREE.Vector3() // 保存原始位置
let hoveredFloor = null // 当前 hover 的楼层
const loadingShow = ref(false) // 切换系统/制冷站
const isFloor = ref(false) // 是否点击了楼层
// 保存初始相机 & 控制器状态
let initialCameraPos = new THREE.Vector3()
let initialTarget = new THREE.Vector3()
const originalStates = new Map()
const modalUrl = props.modelUrl // 默认的系统路径
let startTime = 0
let highlightedMeshes = []
const isHighlighted = ref(false) // 控制状态
const TimeNums = { day: '白天模式', night: '夜间模式' }
const timeText = ref(TimeNums.night)

const toggleFullScreen = () => {
  const container = document.getElementById('container')
  if (!container) return

  if (!isFull.value) {
    container.style.position = 'fixed'
    container.style.top = '0'
    container.style.left = '0'
    container.style.width = '100vw'
    container.style.height = '100vh'
    container.style.zIndex = '9999'
    isFull.value = true
  } else {
    container.style.position = ''
    container.style.top = ''
    container.style.left = ''
    container.style.width = props.initialWidth || '100%'
    container.style.height = props.initialHeight || '100%'
    container.style.zIndex = ''
    isFull.value = false
  }
}

let labelRenderer = null

const initLabelRenderer = () => {
  labelRenderer = new CSS2DRenderer()
  labelRenderer.setSize(window.innerWidth, window.innerHeight)
  labelRenderer.domElement.style.position = 'absolute'
  labelRenderer.domElement.style.top = '0px'
  labelRenderer.domElement.style.pointerEvents = 'none' // 标签不阻塞鼠标事件
  document.body.appendChild(labelRenderer.domElement)
}

const onChangeTime = () => {
  const ambientLight = viewer.scene.getObjectByName('AmbientLight')
  const directionalLight = viewer.scene.getObjectByProperty(
    'type',
    'DirectionalLight'
  )
  const spotLights = viewer.scene.getObjectsByProperty('type', 'SpotLight')
  // console.log(viewer.scene)
  if (timeText.value === TimeNums.night) {
    skyBoxs.setSkybox('night')
    timeText.value = '白天模式'
    ambientLight.intensity = 0.3
    directionalLight.visible = false
    spotLights.forEach(spotLight => {
      spotLight.visible = true
    })
  } else {
    skyBoxs.setSkybox('day')
    timeText.value = '夜间模式'
    ambientLight.intensity = 1.0
    directionalLight.visible = true
    spotLights.forEach(spotLight => {
      spotLight.visible = false
    })
  }
}

const init = async () => {
  viewer = new Viewer('container')
  skyBoxs = new SkyBoxs(viewer)
  viewer.camera.position.set(17, 0, 52)
  viewer.controls.maxPolarAngle = Math.PI / 2.1

  viewer.renderer.shadowMap.enabled = true
  viewer.renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const lights = new Lights(viewer)
  const ambientLight = lights.addAmbientLight()
  ambientLight.setOption({
    color: 0xffffff,
    intensity: 1
  })
  ambientLight.light.name = 'AmbientLight'

  lights.addDirectionalLight([50, 50, 50], {
    color: 'rgb(253,253,253)',
    intensity: 5,
    castShadow: true
  })

  const spotLights = new THREE.Group()
  spotLights.name = 'SpotLights'
  spotLights.add(initSpotLight(10, 32, -30))
  spotLights.add(initSpotLight(-15, 32, -30))
  spotLights.add(initSpotLight(22.5, 32, -30))
  viewer.scene.add(spotLights)

  modelLoader = new ModelLoader(viewer)
  labelIns = new Labels(viewer)

  skyBoxs.setSkybox('night')

  // === 添加底部网格 ===
  const gridHelper = new THREE.GridHelper(
    200,
    100,
    0x0a1f42, // 主线颜色：深蓝紫
    0x1e3a78 // 辅助线颜色：略亮的蓝紫
  )
  initLabelRenderer()
  viewer.scene.add(gridHelper)
}

/**
 * 加载聚光灯
 */
const initSpotLight = (x, y, z) => {
  const spotLightGroup = new THREE.Group()
  const spotLight = new THREE.SpotLight()
  const spotLightHelper = new THREE.SpotLightHelper(spotLight)
  spotLightGroup.add(spotLight)
  spotLightGroup.add(spotLightHelper)
  spotLightGroup.add(spotLight.target)
  // spotLight.castShadow = true;
  spotLight.position.set(x, y, z)
  spotLight.target.position.set(x, y - 2, z - 1)
  spotLight.penumbra = 0.8
  spotLight.visible = false
  spotLightHelper.visible = false
  return spotLightGroup
}

// 中心点(相机始终看向这个点) + 半径 + 模型大小 + Y方向大小 + Y轴旋转角度 + 上下仰角

/**
 * 加载办公大厅
 */
const showLoading = () => {
  loadingShow.value = true
  startTime = Date.now()
}

const hideLoading = () => {
  const delta = Date.now() - startTime
  if (delta < 500) {
    setTimeout(() => (loadingShow.value = false), 500 - delta)
  } else {
    loadingShow.value = false
  }
}

// 增加一个球坐标以后才可以调节视角向上下看
function setCameraViewA (
  center,
  size,
  heightFactor = 1,
  extraHeight = 0,
  azimuthDeg = 45,
  elevationDeg = 30
) {
  const azimuth = THREE.MathUtils.degToRad(azimuthDeg) // 水平方向角度
  const elevation = THREE.MathUtils.degToRad(elevationDeg) // 垂直方向角度
  const radius = size

  // 球坐标 -> 笛卡尔坐标
  const offsetX = Math.cos(elevation) * Math.cos(azimuth) * radius
  const offsetY =
    Math.sin(elevation) * radius + size * heightFactor + extraHeight
  const offsetZ = Math.cos(elevation) * Math.sin(azimuth) * radius

  viewer.camera.position.set(
    center.x + offsetX,
    center.y + offsetY,
    center.z + offsetZ
  )

  viewer.camera.lookAt(center)
  viewer.controls.target.copy(center)
}

const loadOfficeBuild = async () => {
  showLoading()
  modelLoader.loadModelToScene(modalUrl, async model => {
    officeBuild = model
    officeBuild.openCastShadow()
    officeBuild.openReceiveShadow()

    // === 模型贴地处理 ===
    const box = new THREE.Box3().setFromObject(officeBuild.object)
    const yOffset = box.min.y
    officeBuild.object.position.y -= yOffset
    box.setFromObject(officeBuild.object)

    const bottomCenter = new THREE.Vector3(
      (box.min.x + box.max.x) / 2,
      box.min.y - 10,
      (box.min.z + box.max.z) / 2
    )
    officeBuild.object.localToWorld(bottomCenter)

    const grid = viewer.scene.getObjectByProperty('type', 'GridHelper')
    if (grid) {
      grid.position.copy(bottomCenter)
    }

    // === 调整相机 ===
    const size = box.getSize(new THREE.Vector3()).length() / 1.5
    const fixedCenter = box.getCenter(new THREE.Vector3())
    setCameraViewA(
      fixedCenter,
      size,
      props.Zoom,
      -130,
      props.azimuthDeg ?? 0,
      props.elevationDeg
    )

    // === 保存初始状态 ===
    initialCameraPos.copy(viewer.camera.position)
    initialTarget.copy(viewer.controls.target)
    officeBuild.object.children.forEach(child => {
      originalStates.set(child.uuid, {
        position: child.position.clone(),
        visible: true
      })
    })

    if (modalUrl !== '/glb/all.glb') {
      // 给 b045 添加 tooltip

      canClick.value = false
      addTooltipToMesh('b043', '冷冻泵1', { right: '150px' })
      addTooltipToMesh('b044', '冷冻泵2', { right: '150px' })
      addTooltipToMesh('b045', '冷冻泵3', { right: '150px' })

      addTooltipToMesh('b040', '冷却泵1', { left: '150px' })
      addTooltipToMesh('b041', '冷却泵2', { left: '150px' })
      addTooltipToMesh('b042', '冷却泵3', { left: '150px' })

      addTooltipToMesh('j001', '分水器')
      addTooltipToMesh('j002', '集水器')

      addTooltipToMesh('l2241', '冷却塔1')
      addTooltipToMesh('l2235', '冷却塔2')
      addTooltipToMesh('l2247', '冷却塔3')
      addTooltipToMesh('l2259', '冷却塔4')
      addTooltipToMesh('l2253', '冷却塔5')
      addTooltipToMesh('l2265', '冷却塔6')

      addTooltipToMesh('l2269', '冷机2', { top: '50px' })
      addTooltipToMesh('l2379', '冷机1', { top: '50px' })

      highlightModel(officeBuild.object, 'b045', '#3e4d7a', true, [
        'D90_Chilled_Water_Plant_1182',
        'D90_Chilled_Water_Plant_1181',
        'Line230',
        'ChamferBox768'
      ])
      highlightModel(
        officeBuild.object,
        'D90_Chilled_Water_Plant_1182',
        '#3a3d45',
        true
      )
      highlightModel(
        officeBuild.object,
        'D90_Chilled_Water_Plant_1181',
        '#707a9a',
        true
      )
      highlightModel(officeBuild.object, 'Line230', '#707a9a', true)
      highlightModel(officeBuild.object, 'ChamferBox768', '#98989c', true)

      highlightModel(officeBuild.object, 'b044', '#3e4d7a', true, [
        'D90_Chilled_Water_Plant_1172',
        'D90_Chilled_Water_Plant_1159',
        'Line229',
        'ChamferBox765'
      ])
      highlightModel(
        officeBuild.object,
        'D90_Chilled_Water_Plant_1172',
        '#3a3d45',
        true
      )
      highlightModel(
        officeBuild.object,
        'D90_Chilled_Water_Plant_1159',
        '#707a9a',
        true
      )
      highlightModel(officeBuild.object, 'Line229', '#707a9a', true)
      highlightModel(officeBuild.object, 'ChamferBox765', '#98989c', true)

      highlightModel(officeBuild.object, 'b043', '#3e4d7a', true, [
        'D90_Chilled_Water_Plant_1162',
        'D90_Chilled_Water_Plant_1164',
        'Line228',
        'ChamferBox761'
      ])
      highlightModel(
        officeBuild.object,
        'D90_Chilled_Water_Plant_1162',
        '#3a3d45',
        true
      )
      highlightModel(
        officeBuild.object,
        'D90_Chilled_Water_Plant_1164',
        '#707a9a',
        true
      )
      highlightModel(officeBuild.object, 'Line228', '#707a9a', true)
      highlightModel(officeBuild.object, 'ChamferBox761', '#98989c', true)

      // ------

      highlightModel(officeBuild.object, 'b040', '#707a9a', true, [
        'D90_Chilled_Water_Plant_1132',
        'Line225'
      ])
      highlightModel(officeBuild.object, 'Line225', '#a45d42', true)
      highlightModel(
        officeBuild.object,
        'D90_Chilled_Water_Plant_1132',
        '#3a3d45',
        true
      )

      highlightModel(officeBuild.object, 'b041', '#707a9a', true, [
        'D90_Chilled_Water_Plant_1142',
        'Line226'
      ])
      highlightModel(officeBuild.object, 'Line226', '#a45d42', true)
      highlightModel(
        officeBuild.object,
        'D90_Chilled_Water_Plant_1142',
        '#3a3d45',
        true
      )

      highlightModel(officeBuild.object, 'b042', '#707a9a', true, [
        'D90_Chilled_Water_Plant_1152',
        'Line227'
      ])
      highlightModel(officeBuild.object, 'Line227', '#a45d42', true)
      highlightModel(
        officeBuild.object,
        'D90_Chilled_Water_Plant_1152',
        '#3a3d45',
        true
      )

      // ------

      highlightModel(officeBuild.object, 'l2241', '#c9d3f0', true, [
        '缩放比例027',
        'ChamferBox721'
      ])
      highlightModel(officeBuild.object, '缩放比例027', '#145666', true)
      highlightModel(officeBuild.object, 'ChamferBox721', '#fff', true)

      highlightModel(
        officeBuild.object,
        'l2235',
        '#c9d3f0',
        true[('缩放比例026', 'ChamferBox715')]
      )
      highlightModel(officeBuild.object, '缩放比例026', '#145666', true)
      highlightModel(officeBuild.object, 'ChamferBox715', '#fff', true)
      highlightModel(
        officeBuild.object,
        'l2247',
        '#c9d3f0',
        true[('缩放比例028', 'ChamferBox738')]
      )
      highlightModel(officeBuild.object, '缩放比例028', '#145666', true)
      highlightModel(officeBuild.object, 'ChamferBox738', '#fff', true)
      highlightModel(
        officeBuild.object,
        'l2259',
        '#c9d3f0',
        true[('缩放比例030', 'ChamferBox750')]
      )
      highlightModel(officeBuild.object, '缩放比例030', '#145666', true)
      highlightModel(officeBuild.object, 'ChamferBox750', '#fff', true)

      highlightModel(
        officeBuild.object,
        'l2253',
        '#c9d3f0',
        true[('缩放比例029', 'ChamferBox744')]
      )
      highlightModel(officeBuild.object, '缩放比例029', '#145666', true)
      highlightModel(officeBuild.object, 'ChamferBox744', '#fff', true)
      highlightModel(
        officeBuild.object,
        'l2265',
        '#c9d3f0',
        true[('缩放比例031', 'ChamferBox756')]
      )
      highlightModel(officeBuild.object, '缩放比例031', '#145666', true)
      highlightModel(officeBuild.object, 'ChamferBox756', '#fff', true)

      // ------

      highlightModel(officeBuild.object, 'j001', '#576baa', true)
      highlightModel(officeBuild.object, 'j002', '#a45d42', true)

      // ------

      highlightModel(officeBuild.object, 'b041', '#l2269', true, [
        'OilTank061',
        'OilTank063',
        'Part043'
      ])
      highlightModel(officeBuild.object, 'OilTank061', '#3e4d7a', true)
      highlightModel(officeBuild.object, 'OilTank063', '#145666', true)
      highlightModel(officeBuild.object, 'Part043', '#145666', true)

      highlightModel(officeBuild.object, 'b042', '#l2379', true, [
        'OilTank058',
        'OilTank060',
        'Part041'
      ])
      highlightModel(officeBuild.object, 'OilTank058', '#3e4d7a', true)
      highlightModel(officeBuild.object, 'OilTank060', '#145666', true)
      highlightModel(officeBuild.object, 'Part041', '#145666', true)
    }

    hideLoading()
  })
}

// 1️⃣ 红色
const redHighlight = {
  color: 0xff0000, // 主色调
  emissive: 0xff0000, // 发光颜色
  emissiveIntensity: 0.6 // 发光强度
}

// 2️⃣ 淡红色
const lightRedHighlight = {
  color: 0xff6666, // 主色调：红色更明显
  emissive: 0xff3333, // 发光颜色：偏红
  emissiveIntensity: 0.3 // 发光强度：较弱
}

// 3️⃣ 绿色
const greenHighlight = {
  color: 0x00ff00,
  emissive: 0x00ff00,
  emissiveIntensity: 0.6
}

// 4️⃣ 淡绿色
const lightGreenHighlight = {
  color: 0x88ff88,
  emissive: 0x44ff44,
  emissiveIntensity: 0.3
}

const applyHighlight = (mesh, type) => {
  mesh.material = mesh.material.clone() // 避免共用材质污染
  let cfg
  switch (type) {
    case 'red':
      cfg = redHighlight
      break
    case 'lightRed':
      cfg = lightRedHighlight
      break
    case 'green':
      cfg = greenHighlight
      break
    case 'lightGreen':
      cfg = lightGreenHighlight
      break
  }

  mesh.material.color.setHex(cfg.color)
  if (mesh.material.emissive) {
    mesh.material.emissive.setHex(cfg.emissive)
    mesh.material.emissiveIntensity = cfg.emissiveIntensity
  }
}

// 鼠标点击事件
const onMouseClick = event => {
  if (!officeBuild) {
    return
  }

  isActive.value = !isActive.value

  const intersects = raycaster.intersectObjects(
    officeBuild.object.children,
    true
  )

  // if (isFloor.value) {
  // 	isFloor.value = false
  // 	resetHandle()

  // 	return
  // }

  const rect = viewer.renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, viewer.camera)

  if (intersects.length > 0 && !isFloor.value) {
    let floor = intersects[0].object
    while (floor.parent && floor.parent !== officeBuild.object) {
      floor = floor.parent
    }

    // // 点击已选楼层 → 归位
    // if (selectedFloor && selectedFloor === floor) {
    // 	resetHandle()
    // 	return
    // }

    // // 旧楼层复位
    // if (selectedFloor) {
    // 	resetHandle()
    // }

    // 新楼层
    selectedFloor = floor
    floorOriginalPos.copy(floor.position)

    // 其他楼层隐藏
    officeBuild.object.children.forEach(child => {
      if (child !== floor) child.visible = false
    })

    // 抽离动画--点击后的大小
    gsap.to(floor.position, {
      x: floor.position.x - 10,
      y: floor.position.y - 10,
      z: floor.position.z - 20,
      duration: 1.2,
      ease: 'power2.inOut'
    })

    // 相机居中到选中楼层
    const box = new THREE.Box3().setFromObject(floor)
    const center = new THREE.Vector3()
    box.getCenter(center)

    // 点击后的视角
    gsap.to(viewer.camera.position, {
      x: center.x + 10,
      y: center.y + 20,
      z: center.z + 30,
      duration: 1.5,
      ease: 'power2.inOut'
    })

    gsap.to(viewer.controls.target, {
      x: center.x,
      y: center.y,
      z: center.z,
      duration: 1.5,
      ease: 'power2.inOut'
    })

    isFloor.value = true
  }
}

// 重置函数
const resetHandle = () => {
  if (!officeBuild) return

  isActive.value = false

  //  恢复所有楼层位置和可见性
  officeBuild.object.children.forEach(child => {
    const state = originalStates.get(child.uuid)
    if (state) {
      gsap.to(child.position, {
        x: state.position.x,
        y: state.position.y,
        z: state.position.z,
        duration: 1,
        ease: 'power2.inOut'
      })
      child.visible = state.visible
    }
  })

  // 清空选中状态
  selectedFloor = null
  isFloor.value = false

  //  相机 & 控制器平滑回到初始状态
  gsap.to(viewer.camera.position, {
    x: initialCameraPos.x,
    y: initialCameraPos.y,
    z: initialCameraPos.z,
    duration: 1.2,
    ease: 'power2.inOut'
  })
  gsap.to(viewer.controls.target, {
    x: initialTarget.x,
    y: initialTarget.y,
    z: initialTarget.z,
    duration: 1.2,
    ease: 'power2.inOut'
  })
}

const onMouseMove = event => {
  if (!officeBuild) return

  const rect = viewer.renderer.domElement.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouse, viewer.camera)
  const intersects = raycaster.intersectObjects(
    officeBuild.object.children,
    true
  )

  if (intersects.length > 0) {
    let floor = intersects[0].object
    while (floor.parent && floor.parent !== officeBuild.object) {
      floor = floor.parent
    }

    // 切换鼠标小手
    viewer.renderer.domElement.style.cursor = 'pointer'

    // 如果 hover 的对象变化了，先还原上一个
    if (hoveredFloor && hoveredFloor !== floor) {
      resetHoverEffect(hoveredFloor)
    }

    // 给新的楼层加高亮
    if (floor && hoveredFloor !== floor) {
      applyHoverEffect(floor)
      hoveredFloor = floor
    }
  } else {
    viewer.renderer.domElement.style.cursor = 'default'

    // 没有命中，清除 hover 效果
    if (hoveredFloor) {
      resetHoverEffect(hoveredFloor)
      hoveredFloor = null
    }
  }
}

// 应用高亮（轻微效果）
const applyHoverEffect = mesh => {
  mesh.traverse(child => {
    if (child.isMesh) {
      // child.currentHex = child.material.emissive?.getHex() // 记住原始颜色
      // child.material.emissive?.setHex(0x3399ff) // 柔和的淡蓝色
      // child.material.emissiveIntensity = 0.25 // 轻微高亮
    }
  })
}

// 还原高亮
const resetHoverEffect = mesh => {
  mesh.traverse(child => {
    if (child.isMesh && child.currentHex !== undefined) {
      child.material.emissive?.setHex(child.currentHex)
      child.material.emissiveIntensity = 1 // 恢复到更低的默认值
    }
  })
}

const canClick = ref(true) // 控制点击是否有效
const canHover = ref(true) // 控制鼠标移动是否有效

const handleClick = event => {
  if (!canClick.value) return
  onMouseClick(event)
}

const handleMouseMove = event => {
  if (!canHover.value) return
  onMouseMove(event)
}

onMounted(async () => {
  progressBarShow.value = true
  await init()
  await Promise.all([loadOfficeBuild()])

  viewer.renderer.domElement.addEventListener('click', handleClick)
  viewer.renderer.domElement.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  if (viewer && viewer.renderer) {
    viewer.renderer.domElement.removeEventListener('click', handleClick)
    viewer.renderer.domElement.removeEventListener('mousemove', handleMouseMove)
  }
  if (viewer) viewer.dispose()
  gsap.globalTimeline.clear()
})

watch(
  () => props.Zoom,
  newZoom => {
    loadOfficeBuild()
  }
)
</script>

<style scoped lang="less">
@import './index.less';
</style>
