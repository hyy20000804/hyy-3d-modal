<template>
  <div id="jindu-text-con" v-if="progressBarShow">
    正在加载模型请稍等：<span id="jindu-text">{{ progressText }}</span>
    <div class="jindu-con">
      <div id="jindu" :style="{ width: progressText }"></div>
    </div>
  </div>

  <div id="container" ref="container">
    <i
      :class="['iconfont', isFull ? 'icon-suoxiao' : 'icon-fangda']"
      class="fullscreen-icon"
      @click="toggleFullScreen"
    ></i>

    <div class="operate-box">
      <el-button type="warning" @click="onReset">场景重置</el-button>
      <el-button type="warning" @click="onChangeTime">{{ timeText }}</el-button>
      <el-button type="warning" @click="onDoor">{{ '门禁管理' }}</el-button>
      <el-button type="warning" @click="lightHandle">灯光调节</el-button>
    </div>

    <!-- 浮动灯光面板 -->
    <transition name="fade-slide">
      <div v-if="panelVisible" class="light-panel" @click.stop>
        <div class="panel-header">
          <span>灯光调节</span>
          <el-icon @click="panelVisible = false"><Close /></el-icon>
        </div>

        <div class="panel-body">
          <div class="slider-item">
            <span>环境光强度：</span>
            <el-slider
              v-model="ambientIntensity"
              :min="0"
              :max="10"
              :step="0.1"
              @input="updateAmbientLight"
            />
          </div>

          <div class="slider-item">
            <span>平行光强度：</span>
            <el-slider
              v-model="directionalIntensity"
              :min="0"
              :max="10"
              :step="0.1"
              @input="updateDirectionalLight"
            />
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, defineProps, onUnmounted, watch, computed } from 'vue'
import * as THREE from 'three'
import Viewer from '@/common/threeModules/Viewer'
import SkyBoxs from '@/common/threeModules/SkyBoxs'
import Lights from '@/common/threeModules/Lights'
import ModelLoader from '@/common/threeModules/ModelLoader'
import Labels from '@/common/threeModules/Labels'
import { Water } from 'three/examples/jsm/objects/Water2'
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js'
import gsap from 'gsap'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'

const props = defineProps({
  initialWidth: String,
  initialHeight: String
})

let viewer = null
let cityv1 = null
let car = null
let carLabel = null
let officeLabel = null
let officeBuild = null
let oldOfficeBuild = {}
let curve = null
let Mesh26 = null
let timeen = {}
let modelLoader = null
let labelIns = null // 标签实例
let laboratoryBuild = {}
let videoTextTure = null // 视频纹理
let curFloorName = '' // 当前鼠标点击选中的楼层name
let modelMoveName = '' // 当前鼠标移动过程中选中的模型name
let selectedFloorName = '' // 已经选中过的楼层name
let isSplit = false // 楼体是否分层
let lastIndex // 记录上一次点击的楼层index
let skyBoxs = null
const sceneList = ['实验楼']
const TimeNums = {
  day: '白天模式',
  night: '夜间模式'
}

let progress = 0 // 物体运动时在运动路径的初始位置，范围0~1
const velocity = 0.001 // 影响运动速率的一个值，范围0~1，需要和渲染频率结合计算才能得到真正的速率
const officeFloorList = Array(6)
  .fill(0)
  .map((item, index) => `zuo${index}`) // 办公室楼层

const isopen = ref(false)
const progressText = ref('0%')
const progressBarShow = ref(true)
const isDriver = ref(false)
const timeText = ref(TimeNums.night)
const name = ref('')
const selectedFloor = ref('')
const isRun = ref(false)
const isFull = ref(false)
const addOrUpdateRef = ref()

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

let ambientLight = null
let directionalLight = null

const panelVisible = ref(false)
const ambientIntensity = ref(5)
const directionalIntensity = ref(3)

// 初始化 Three.js 场景与灯光
const init = async () => {
  viewer = new Viewer('container')

  // 相机与控制配置
  viewer.camera.position.set(17, 10, 52)
  viewer.controls.maxPolarAngle = Math.PI / 2.1
  viewer.renderer.shadowMap.enabled = true
  viewer.renderer.shadowMap.type = THREE.PCFSoftShadowMap
  viewer.controls.minDistance = 20
  viewer.controls.maxDistance = 150

  // 创建灯光
  const lights = new Lights(viewer)
  ambientLight = lights.addAmbientLight()
  ambientLight.setOption({ color: 0xffffff, intensity: ambientIntensity.value })
  ambientLight.light.name = 'AmbientLight'

  const dirLight = lights.addDirectionalLight([100, 100, -10], {
    color: 'rgb(253,253,253)',
    intensity: directionalIntensity.value,
    castShadow: true
  })
  directionalLight = dirLight.light

  modelLoader = new ModelLoader(viewer)
  labelIns = new Labels(viewer)
}

// 控制面板显示
const lightHandle = () => {
  panelVisible.value = !panelVisible.value
}

// 更新灯光强度
const updateAmbientLight = val => {
  if (ambientLight) ambientLight.light.intensity = val
}

const updateDirectionalLight = val => {
  if (directionalLight) directionalLight.intensity = val
}

// const init = async () => {
//   viewer = new Viewer('container')
//   skyBoxs = new SkyBoxs(viewer) // 创建天空盒
//   viewer.camera.position.set(17, 10, 52)
//   viewer.controls.maxPolarAngle = Math.PI / 2.1 //  90度，防止相机钻到地下
//   viewer.renderer.shadowMap.enabled = true
//   viewer.renderer.shadowMap.type = THREE.PCFSoftShadowMap

//   // 限制缩放
//   viewer.controls.minDistance = 20
//   viewer.controls.maxDistance = 150

//   const lights = new Lights(viewer)
//   const ambientLight = lights.addAmbientLight() // 添加环境光
//   ambientLight.setOption({
//     color: 0xffffff,
//     intensity: 5 // 环境光强度
//   })
//   ambientLight.light.name = 'AmbientLight'
//   // 添加平行光
//   lights.addDirectionalLight([100, 100, -10], {
//     color: 'rgb(253,253,253)',
//     intensity: 3,
//     castShadow: true // 是否投射阴影
//   })
//   const spotLights = new THREE.Group()
//   spotLights.name = 'SpotLights'
//   spotLights.add(initSpotLight(10, 32, -30))
//   spotLights.add(initSpotLight(-2.5, 32, -30))
//   spotLights.add(initSpotLight(-15, 32, -30))
//   spotLights.add(initSpotLight(22.5, 32, -30))
//   viewer.scene.add(spotLights)
//   modelLoader = new ModelLoader(viewer)
//   labelIns = new Labels(viewer)
// }
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

/**
 * 加载人
 */
let personModel = null

const loadPeople = () => {
  const oldPerson = viewer.scene.getObjectByName('人')
  if (oldPerson) {
    viewer.scene.remove(oldPerson)
    oldPerson.traverse(child => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
  }

  modelLoader.loadModelToScene('/glb/ren.glb', model => {
    model.openCastShadow()
    model.object.position.set(13, 0, 18)
    model.object.scale.set(0.5, 0.5, 0.5)
    model.object.name = '人'
    personModel = model
    model.startAnimal(1)

    startPos.set(
      model.object.position.x,
      model.object.position.y,
      model.object.position.z
    )
  })
}

/**
 * 加载路灯
 */
const loadLamp = () => {
  const loader = new GLTFLoader()
  loader.load('/glb/lightpostDouble.glb', gltf => {
    const gltfScene = gltf.scene
    let baseMesh = null

    // 从模型中找出第一个 Mesh（可根据你实际结构更精细地指定）
    gltfScene.traverse(child => {
      if (child.isMesh && !baseMesh) {
        baseMesh = child.clone()
      }
    })

    if (!baseMesh) {
      console.error('未找到 baseMesh')
      return
    }

    // 创建 InstancedMesh（6个实例）
    const count = 6
    const instancedMesh = new THREE.InstancedMesh(
      baseMesh.geometry,
      baseMesh.material,
      count
    )

    instancedMesh.castShadow = true
    instancedMesh.receiveShadow = true
    instancedMesh.name = '路灯组'

    // 设置每个实例的位置矩阵
    const positions = [
      [23, 0, 29],
      [20, 0, 29],
      [17, 0, 29],
      [14, 0, 29],
      [9, 0, 29],
      [6, 0, 29]
    ]

    const dummy = new THREE.Object3D()
    positions.forEach((pos, i) => {
      dummy.position.set(...pos)
      dummy.scale.set(1, 3, 1)
      dummy.updateMatrix()
      instancedMesh.setMatrixAt(i, dummy.matrix)
    })

    // 加到场景中
    viewer.scene.add(instancedMesh)
  })
}

/**
 * 初始化停车场栅栏
 */
const initFence = () => {
  modelLoader.loadModelToScene(
    '/glb/city-v1.glb',
    model => {
      model.object.name = 'cityv1'
      model.openCastShadow() // 开启投射阴影
      model.openReceiveShadow() // 开启接收阴影
      model.object.children.forEach(item => {
        // 门口栅栏动画
        if (item.name === 'Mesh26') {
          Mesh26 = item
          gsap.to(item.scale, {
            x: item.scale.x / 8,
            duration: 5,
            ease: 'power1.inOut',
            onComplete: () => {
              makeCurve()
              isopen.value = true
            }
          })
        }
      })
      timeen = {
        fun: moveOnCurve,
        content: car
      }
      viewer.addAnimate(timeen)
      cityv1 = model.object.clone()
    },
    pgs => {
      pgs = Math.floor(pgs * 100)
      progressText.value = pgs + '%'
      if (pgs === 100) {
        progressBarShow.value = false
      }
    },
    error => {
      console.log('----加载city-v1.glb报错---', error)
    }
  )
}

/**
 * 快递车移动轨迹
 */
const moveOnCurve = model => {
  if (curve && car) {
    if (progress <= 1 - velocity) {
      let carObj = model.object
      let boxx = model.getBox()
      carLabel.position.set(boxx.max.x, boxx.max.y + 2, boxx.max.z)
      if (
        carObj.position.z.toFixed(2) >= 28.0 &&
        carObj.position.z.toFixed(2) <= 28.1
      ) {
        if (isopen.value) {
          gsap.to(Mesh26.scale, {
            x: Mesh26.scale.x * 8,
            duration: 5,
            ease: 'power1.inOut',
            onComplete: () => {
              isopen.value = false
            }
          })
        } else {
          gsap.to(Mesh26.scale, {
            x: Mesh26.scale.x / 8,
            duration: 5,
            ease: 'power1.inOut',
            onComplete: () => {
              isopen.value = true
              viewer.addAnimate(timeen)
            },
            onStart: () => {
              viewer.removeAnimate(timeen)
            }
          })
        }
      }

      const point = curve.getPointAt(progress) // 获取样条曲线指定点坐标
      const pointBox = curve.getPointAt(progress + velocity) // 获取样条曲线指定点坐标

      if (point && pointBox) {
        carObj.position.set(point.x, point.y, point.z)
        //因为这个模型加载进来默认面部是正对Z轴负方向的，所以直接lookAt会导致出现倒着跑的现象，这里用重新设置朝向的方法来解决。
        carObj.lookAt(pointBox.x, pointBox.y, pointBox.z)
        if (isDriver.value) {
          viewer.camera.position.set(point.x, point.y + 2, point.z)
          viewer.camera.lookAt(pointBox.x, pointBox.y + 2, pointBox.z)
        }

        const offsetAngle = 22 // 目标移动时的朝向偏移
        const mtx = new THREE.Matrix4() // 创建一个4维矩阵
        mtx.lookAt(carObj.position, pointBox, carObj.up) // 设置朝向
        mtx.multiply(
          new THREE.Matrix4().makeRotationFromEuler(
            new THREE.Euler(0, offsetAngle, 0)
          )
        )
        const toRot = new THREE.Quaternion().setFromRotationMatrix(mtx) //计算出需要进行旋转的四元数值
        carObj.quaternion.slerp(toRot, 0.2)
      }
      progress += velocity
    } else {
      progress = 0
    }
  }
}

/** * 快递车行驶轨迹 */
const makeCurve = () => {
  // 从一系列的点创建一条平滑的三维样条曲线
  curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(11.5, 0, 18),
    new THREE.Vector3(11.5, 0, 34),
    new THREE.Vector3(35, 0, 34),
    new THREE.Vector3(35, 0, 31),
    new THREE.Vector3(11.5, 0, 31)
  ])
  curve.curveType = 'catmullrom' // 曲线类型
  curve.closed = true // 是否封闭曲线
  curve.tension = 0 // 设置线的张力，0为无弧度折线

  // 为曲线添加材质在场景中显示出来，不显示也不会影响运动轨迹，相当于一个Helper
  const points = curve.getPoints(0.1) // 获取曲线上的点
  const geometry = new THREE.BufferGeometry().setFromPoints(points) // 创建几何体
  const material = new THREE.LineBasicMaterial({ color: 0xff0000 }) // 线材质
  const curveObject = new THREE.Line(geometry, material) // 线
  curveObject.position.y = -1
  viewer.scene.add(curveObject)
}

/**
 * 加载办公大厅
 */
// Promise 版本的 loadOfficeBuild
const loadOfficeBuild = () => {
  return new Promise(resolve => {
    modelLoader.loadModelToScene('/glb/officeBuild.glb', model => {
      officeBuild = model
      officeBuild.openCastShadow()
      officeBuild.openReceiveShadow()

      // 旋转360度
      officeBuild.object.rotation.y = Math.PI
      officeBuild.object.position.set(16, 0, -5)
      officeBuild.object.scale.set(0.2, 0.2, 0.2)
      officeBuild.object.name = '办公大厅'

      officeBuild.object.children.forEach(item => {
        item.name = item.name.replace('zuo', '')
        if (item.name === 'ding') {
          item.name = 6
        }
        item.name--
      })

      model.object.children.forEach(child => {
        console.log('一级子节点:', child.name, model.object.children)
      })

      officeBuild.object.children
        .sort((a, b) => a.name - b.name)
        .forEach(v => {
          v.name = 'zuo' + v.name
        })

      officeBuild.forEach(child => {
        if (child.isMesh) {
          child.frustumCulled = false // 关闭投射阴影
          child.material.emissive = child.material.color // 设置材质颜色
          child.material.emissiveMap = child.material.map // 设置材质贴图
          child.material.emissiveIntensity = 1.2 // 设置材质强度
          child.material.envmap = viewer.scene.background // 设置环境贴图
        }
      })

      oldOfficeBuild = officeBuild.object.clone()
      const buildBox = officeBuild.getBox()

      officeLabel = labelIns.addCss2dLabel(
        {
          x: buildBox.max.x / 2,
          y: buildBox.max.y,
          z: buildBox.max.z
        },
        `<span class="label">${model.object.name}</span>`
      )

      // 添加标签动画
      if (labelIns?.label?.position) {
        gsap.to(labelIns.label.position, {
          y: buildBox.max.y + 2,
          repeat: -1,
          yoyo: true,
          duration: 2,
          ease: 'Bounce.inOut'
        })
      } else {
        console.warn('labelIns.label.position 不存在，动画未执行')
      }

      // ✅ 模型加载完成，返回 model
      resolve(model)
    })
  })
}

/**
 * 办公楼鼠标移动效果
 */
const officeMouseMove = () => {
  // TODO: 做一个节流
  viewer.startSelectEvent('mousemove', false, model => {
    if (curFloorName) {
      viewer.stopSelectEvent()
    }

    if (model.parent?.parent?.name === '办公大厅' && !isSplit) {
      officeFloorList.forEach(item => {
        if (item === model.parent.name) {
          modelMoveName = item
          if (curFloorName === modelMoveName) {
            // 如果当前选中的楼层和鼠标移动选中的楼层相同，则不给当前选中的楼层改变材质，仍保持原来的材质
            return
          }
          officeBuild.object.getObjectByName(item).traverse(child => {
            if (child.isMesh) {
              child.material = new THREE.MeshStandardMaterial({
                color: 0x000000, // 设为黑色，避免底色影响
                transparent: true,
                opacity: 0.6, // 完全透明
                emissive: new THREE.Color('0x000000'), // 发光颜色
                emissiveIntensity: 3 // 发光强度
              })
            }
          })
        } else {
          if (!isSplit) {
            const oldModel = oldOfficeBuild.getObjectByName(item)
            officeBuild.object.getObjectByName(item)?.traverse(child => {
              if (child.isMesh) {
                // 将未选中的楼层赋予之前的材质
                child.material = oldModel.getObjectByName(child.name).material
              }
            })
          } else {
          }
        }
      })
    }
  })
}

/**
 * 办公楼点击
 */
const officeFloorClick = () => {
  viewer.renderer.domElement.addEventListener('click', e => {
    // addOrUpdateRef.value.openDialog()

    const rayCaster = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    // 将鼠标位置归一化为设备坐标。x 和 y 方向的取值范围是 (-1 to +1)
    mouse.x = (e.offsetX / viewer.renderer.domElement.clientWidth) * 2 - 1
    mouse.y = -(e.offsetY / viewer.renderer.domElement.clientHeight) * 2 + 1
    // 通过摄像机和鼠标位置更新射线
    rayCaster.setFromCamera(mouse, viewer.camera)
    const intersects = rayCaster.intersectObject(viewer.scene, true) // 计算物体和射线的焦点
    console.log('----intersects----', intersects, viewer.scene.children)

    if (intersects.length > 0 && modelMoveName) {
      const model = intersects[0].object.parent
      if (model.name.includes('zuo')) {
        if (!isSplit) {
          // 隐藏车和标签
          // TODO: 找到更方便的模型指定方式，而不是每次都遍历查找
          // carLabel.visible = false
          officeLabel.visible = false
          // viewer.scene.children.find(item => item.name === '快递车').visible = false
          viewer.scene.children.find(o => o.name == 'cityv1').visible = false
          viewer.scene.children.find(o => o.name == '树').visible = false
          viewer.scene.children.find(o => o.name == '路灯组').visible = false
          // viewer.scene.children.find(o => o.name == 'bird').visible = false
          viewer.scene.children.find(o => o.name == '人').visible = false
          // viewer.scene.children.find(o => o.name == '广告牌').visible = false
          viewer.scene.children.find(o => o.name == '实验楼').visible = false

          viewer.scene.children.find(o => o.name == '水池').visible = false
        }
        selectOffice(model)
      } else {
        if (!isSplit) {
          const oldModel = oldOfficeBuild.getObjectByName(modelMoveName)
          officeBuild.object
            .getObjectByName(modelMoveName)
            .traverse(function (child) {
              if (child.isMesh) {
                child.material = oldModel.getObjectByName(child.name).material
              }
            })
        }
      }
    }
  })
}

const selectOffice = model => {
  curFloorName = model.name
  const oldModel = oldOfficeBuild.getObjectByName(curFloorName)
  // 找到当前点击的楼层
  const modelSelectIndex = officeFloorList.findIndex(
    item => item === curFloorName
  )
  if (modelSelectIndex === lastIndex) return
  if (!isSplit) {
    // 楼体还未分层的时候要做的事
    officeBuild.object.children.forEach((child, index) => {
      if (child.name === curFloorName) {
        // 当前楼层附着原本材质
        child.children.forEach(ol => {
          ol.material = oldModel.getObjectByName(ol.name).material
        })
      }

      if (index > 0) {
        isSplit = true
        gsap.to(child.position, {
          y: child.position.y + index * 10,
          duration: 2,
          ease: 'power1.inOut'
        })
      }
    })
  } else {
    // TODO:点击快了之后会出现错乱；
    // 楼体分层之后点击抽出楼层
    officeBuild.object.children.forEach((child, index) => {
      if (index === lastIndex) {
        // 将上一次抽出的楼层归位
        gsap.to(child.position, {
          z: child.position.z + 40,
          duration: 2,
          ease: 'power1.inOut'
        })
      }
      if (child.name === curFloorName) {
        gsap.to(child.position, {
          z: child.position.z - 40,
          duration: 2,
          ease: 'power1.inOut',
          onComplete: () => {
            lastIndex = index
          }
        })
      }
    })
  }

  gsap.to(viewer.controls.target, {
    x: 12,
    y: 0,
    z: -5,
    duration: 2,
    ease: 'power1.inOut',
    onComplete: () => {}
  })
}

/**
 * 加载实验楼
 */
const loadLaboratoryBuild = () => {
  modelLoader.loadModelToScene(' /glTF/laboratoryBuild.gltf', model => {
    const geometryArr = []
    const materialArr = []
    // 获取几何体/材质数组
    model.object.traverse(item => {
      item.updateMatrixWorld(true)
      if (item.isMesh) {
        item.geometry.applyMatrix4(item.matrixWorld)
        geometryArr.push(item.geometry)
        materialArr.push(item.material)

        // // 置灰
        // instancedMesh.material.color.set(0x808080)
        // instancedMesh.material.transparent = true
        // instancedMesh.material.opacity = 0.1

        // 恢复原色
        // instancedMesh.material.color.set(0xffffff)
      }
    })
    const geometryMerged = BufferGeometryUtils.mergeGeometries(
      geometryArr,
      true
    )

    const meshMerged = new THREE.Mesh(geometryMerged, materialArr)

    model.object.remove(model.object.children[0])
    model.object.add(meshMerged)

    meshMerged.castShadow = true
    meshMerged.receiveShadow = true
    model.object.rotateY(Math.PI / 2)
    model.object.position.set(-17, 0, 5)
    model.object.scale.set(0.7, 0.7, 0.7)
    model.object.name = '实验楼'

    laboratoryBuild = model.object.clone()

    // 添加标签动画
    if (labelIns?.label?.position) {
      gsap.to(labelIns.label.position, {
        y: buildBox.max.y + 2,
        repeat: -1,
        yoyo: true,
        duration: 2,
        ease: 'Bounce.inOut'
      })
    } else {
      console.warn('labelIns.label.position 不存在，动画未执行')
    }
  })
}

/**
 * 加载树
 */
let treeModel = null

const loadTree = () => {
  modelLoader.loadModelToScene('/glTF/tree_animate/new-scene.gltf', model => {
    model.openCastShadow()
    model.object.position.set(8, 0, 16)
    model.object.scale.set(0.08, 0.08, 0.08)
    model.object.name = '树'
    model.startAnimal()

    treeModel = model.object
    updateTreeColor()

    addVerticalProgressBar()
  })
}

/** * 手绘进度条 */

let progressBar, progressBg
const progressHeight = 10 // 固定高度
const progressWidth = 0.1 // 进度条宽度

function addVerticalProgressBar () {
  // 背景条
  const bgGeometry = new THREE.PlaneGeometry(progressWidth, progressHeight)
  const bgMaterial = new THREE.MeshBasicMaterial({
    color: 0x444444,
    side: THREE.DoubleSide
  })
  progressBg = new THREE.Mesh(bgGeometry, bgMaterial)

  // 绿色进度条
  const barGeometry = new THREE.PlaneGeometry(progressWidth, progressHeight)
  const barMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide
  })
  progressBar = new THREE.Mesh(barGeometry, barMaterial)

  // 设置锚点在底部
  barGeometry.translate(0, -progressHeight / 2, 0)

  // 相对树的位置（右侧）
  const offsetX = 5
  const offsetY = progressHeight / 2
  const offsetZ = 0

  progressBg.position.set(offsetX, offsetY, offsetZ)
  progressBar.position.set(offsetX, offsetY, offsetZ + 0.01)

  // 添加到树
  treeModel.add(progressBg)
  treeModel.add(progressBar)
}
// 每帧保持朝向摄像机
// 在动画循环中让它一直面向相机
// function updateProgressBarBillboard () {
// 	if (progressBg && progressBar) {
// 		progressBg.lookAt(camera.position)
// 		progressBar.lookAt(camera.position)
// 	}
// }

/**
 * 改变树的颜色
 */
const updateTreeColor = () => {
  if (!treeModel) return
  treeModel.traverse(child => {
    if (child.isMesh) {
      child.material = child.material.clone()
      child.material.color.set(0xffffff)
      child.material.transparent = false
      child.material.opacity = 1
    }
  })
}

/**
 * 加载水池
 */
const loadSwimmingPool = () => {
  modelLoader.loadModelToScene('/glb/pool.glb', model => {
    model.openCastShadow()
    model.openReceiveShadow()
    model.object.position.set(12, 1, -16)
    model.object.scale.set(0.6, 0.5, 0.6)
    model.object.name = '水池'

    const waterTexLoader = new THREE.TextureLoader()
    const oldWater = model.object.getObjectByName('voda_0')
    const waterMesh = new Water(oldWater.children[0].geometry, {
      textureWidth: 512,
      textureHeight: 512,
      color: 0xeeeeff,
      flowDirection: new THREE.Vector2(1, 1),
      scale: 1,
      normalMap0: waterTexLoader.load('/images/Water_1_M_Normal.jpg'),
      normalMap1: waterTexLoader.load('/images/Water_2_M_Normal.jpg')
    })
    waterMesh.name = '动态水'
    oldWater.remove(oldWater.children[0])
    oldWater.add(waterMesh)
  })
}

/**
 * 重置
 */
const onReset = () => {
  gsap.to(viewer.camera.position, {
    x: 17,
    y: 10,
    z: 52,
    duration: 2,
    ease: 'Bounce.inOut'
  })
  gsap.to(viewer.scene.children.find(o => o.name == '人').rotation, {
    y: 0,
    duration: 2,
    ease: 'power1.inOut'
  })
  viewer.scene.children.find(o => o.name === '人').position.set(13, 0, 18)

  // carLabel.visible = true
  officeLabel.visible = true
  // viewer.scene.children.find(o => o.name === '快递车').visible = true
  viewer.scene.children.find(o => o.name === '树').visible = true
  viewer.scene.children.find(o => o.name === 'cityv1').visible = true
  viewer.scene.children[
    viewer.scene.children.findIndex(o => o.name == '实验楼')
  ] = laboratoryBuild.clone()
  viewer.scene.children[
    viewer.scene.children.findIndex(o => o.name == '办公大厅')
  ] = officeBuild.object = oldOfficeBuild.clone()
  viewer.scene.children.find(o => o.name == '水池').visible = true
  viewer.scene.children.find(o => o.name == '路灯组').visible = true
  // viewer.scene.children.find(o => o.name == 'bird').visible = true
  viewer.scene.children.find(o => o.name == '人').visible = true
  // viewer.scene.children.find(o => o.name == '广告牌').visible = true

  curFloorName = ''
  modelMoveName = null
  isSplit = false
  lastIndex = null
  selectedFloorName = ''
  officeMouseMove()
  loadPeople()
}

/**
 * 点击门禁事件
 */

const startPos = new THREE.Vector3(0, 0, 0) // 起点
const targetPos = new THREE.Vector3(13, 0, 13) // 终点
const isAtTarget = ref(false) // true=在目标点，false=在起点

// 点击门禁事件
const onDoor = () => {
  // 如果当前正在跑，阻止重复点击
  if (isRun.value) return
  isRun.value = true

  const person = viewer.scene.getObjectByName('人')
  if (!person || !personModel) {
    console.error('未找到人物模型或动画控制器')
    isRun.value = false
    return
  }

  const currentPos = person.position.clone()
  const isAtStart = currentPos.distanceTo(startPos) < 0.1

  const targetPos = isAtStart
    ? new THREE.Vector3(13, 0, 13) // 去门口
    : startPos.clone() // 返回原位

  personModel.startAnimal(6) // walk

  // 清理旧动画
  gsap.killTweensOf(person.position)
  gsap.killTweensOf(person.rotation)
  gsap.killTweensOf(viewer.camera.position)
  gsap.killTweensOf(viewer.controls.target)

  const tl = gsap.timeline({
    onComplete: () => {
      personModel.stopAnimal()
      personModel.startAnimal(1) // idle
      isRun.value = false
    }
  })

  // 人物移动
  tl.to(person.position, {
    x: targetPos.x,
    y: targetPos.y,
    z: targetPos.z,
    duration: 3,
    ease: 'power1.inOut'
  })

  // 人物转向
  tl.to(
    person.rotation,
    {
      y: isAtStart ? Math.PI : 0, // 返回时转回原方向
      duration: 1,
      ease: 'power1.inOut'
    },
    0
  )

  // 相机跟随
  tl.to(
    viewer.camera.position,
    {
      x: targetPos.x,
      y: targetPos.y + 2,
      z: targetPos.z + 5,
      duration: 3,
      ease: 'power1.inOut'
    },
    0
  )

  tl.to(
    viewer.controls.target,
    {
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      duration: 3,
      ease: 'power1.inOut'
    },
    0
  )
}

/**
 * 加载车辆
 */
const loadCar = () => {
  modelLoader.loadModelToScene('/glTF/car13.gltf', model => {
    car = model
    model.openCastShadow()
    model.openReceiveShadow()
    model.object.position.set(11.5, 0, 18)
    model.object.scale.set(1, 1, 1)
    model.object.name = '快递车'

    const spotLight = new THREE.SpotLight()

    model.object.add(spotLight)
    model.object.add(spotLight.target)

    spotLight.angle = Math.PI / 4
    spotLight.position.set(0, 2, 2)
    spotLight.target.position.set(0, 1, 3)
    spotLight.penumbra = 0.8

    spotLight.castShadow = true
    // spotLight.shadow.radius = 5 // PCFSS不支持radius
    spotLight.shadow.mapSize.width = 1024
    spotLight.shadow.mapSize.height = 1024
    spotLight.shadow.camera.near = 0.1
    spotLight.shadow.camera.far = 100
    spotLight.shadow.camera.bias = 0.005 // 去除摩尔纹、伪影

    spotLight.visible = false

    let boxx = model.getBox()
    // 加载车的标签
    carLabel = labelIns.addCss2dLabel(
      {
        x: boxx.max.x,
        y: boxx.max.y + 2,
        z: boxx.max.z
      },
      `<span class="label">${model.object.name}</span>`
    )

    progressBarShow.value = false
  })
}

/** * 凤凰 */
const loadBird = () => {
  return new Promise(resolve => {
    modelLoader.loadModelToScene('/glb/bird.glb', model => {
      model.openCastShadow()

      // 计算包围盒并缩放模型
      const box = new THREE.Box3().setFromObject(model.object)
      const size = new THREE.Vector3()
      box.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 1 / maxDim
      model.object.scale.set(scale, scale, scale)

      model.object.position.set(15, 0, 29)
      model.object.name = 'bird'

      model.startAnimal(0)

      // ✅ 模型加载完成，返回 model
      resolve(model)
    })
  })
}

// 让一个模型绕另一个模型顺时针旋转
function makeModelOrbitGSAP (
  movingModel,
  centerModel,
  radius = 5,
  duration = 10
) {
  // 获取中心点
  const center = new THREE.Vector3()
  new THREE.Box3().setFromObject(centerModel.object).getCenter(center)

  // 保存一个角度变量
  const orbitData = { angle: 0 }

  // 创建无限循环动画（顺时针用负角度）
  const orbitTween = gsap.to(orbitData, {
    angle: -Math.PI * 2, // 一圈
    duration: duration, // 一圈用时（秒）
    repeat: -1, // 无限循环
    ease: 'none', // 匀速旋转
    onUpdate: () => {
      movingModel.object.position.x =
        center.x + radius * Math.cos(orbitData.angle)
      movingModel.object.position.z =
        center.z + radius * Math.sin(orbitData.angle)
      movingModel.object.position.y = center.y // 保持高度
    }
  })

  // 返回动画对象，方便暂停、继续、加速
  return orbitTween
}

onMounted(async () => {
  await init()
  await Promise.all([loadLaboratoryBuild(), loadLamp()])

  // 等两个模型都加载好
  const [office, bird] = await Promise.all([loadOfficeBuild(), loadBird()])

  makeModelOrbitGSAP(bird, office, 10, 20) // 半径 10，一圈 5 秒

  progressBarShow.value = false

  // viewer.addAnimate(updateProgressBarBillboard)
  // 非核心资源延后加载
  requestIdleCallback(() => {
    loadPeople()
    loadCar()
    loadTree()
    initFence()
    officeMouseMove()
    officeFloorClick()
    loadSwimmingPool()
  })
})

onUnmounted(() => {
  if (viewer) viewer.dispose()
  gsap.globalTimeline.clear()
})
</script>

<style scoped lang="less">
@import './index.less';
</style>
