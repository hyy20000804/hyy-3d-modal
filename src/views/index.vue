<template>
  <div id="cesiumContainer" class="container"></div>

  <div
    v-if="showPreview"
    class="preview-overlay active"
    @click="showPreview = false"
  >
    <img :src="previewImage" alt="城市预览" />
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as Cesium from 'cesium'
import { useRouter } from 'vue-router'
import whiteBg from '@/assets/three.png'
import { ElNotification } from 'element-plus'

const router = useRouter()
const showPreview = ref(false) // 控制弹窗显示
const previewImage = ref('') // 预览图 URL

let viewer = null
let handler = null // 鼠标事件处理

const cities = ref([
  { name: '北京', lon: 116.4074, lat: 39.9042 },
  { name: '上海', lon: 121.4737, lat: 31.2304 },
  { name: '广州', lon: 113.2644, lat: 23.1291 },
  {
    name: '深圳',
    lon: 114.0579,
    lat: 22.5431
  },
  { name: '成都', lon: 104.0665, lat: 30.5723 },
  { name: '武汉', lon: 114.3054, lat: 30.5931 },
  { name: '重庆', lon: 106.5505, lat: 29.563 },
  { name: '杭州', lon: 120.1551, lat: 30.2741 },
  { name: '南京', lon: 118.7969, lat: 32.0603 },
  { name: '西安', lon: 108.9398, lat: 34.3416 }
])

const init = async () => {
  Cesium.Ion.defaultAccessToken =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkYzQ0Y2ZkMC0wMGJiLTQ0MTAtYTljMy04NmRjZjRjMjk5NDQiLCJpZCI6MTgyODQyLCJpYXQiOjE3NjQ1NzA3Mjl9.ekeIPHxixpNUj7hc596I3nFnKpFJzY0WxfqBDRZPHNE'

  // 初始化 viewer
  viewer = new Cesium.Viewer('cesiumContainer', {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    sceneModePicker: false,
    infoBox: false,
    homeButton: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    selectionIndicator: false,

    creditContainer: document.createElement('div') // 隐藏 Cesium ion credit

    // 写在这里没用
    // imageryProvider: new Cesium.UrlTemplateImageryProvider({
    //   url: 'https://webst01.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}', // style=8 = 卫星影像
    //   maximumLevel: 18
    // })
  })

  viewer.scene.backgroundColor = Cesium.Color.BLACK

  // 创建影像图层并添加错误处理
  try {
    const imageryProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
      maximumLevel: 18
    })

    // 监听错误
    imageryProvider.errorEvent.addEventListener(function (error) {
      console.error('影像加载错误:', error)
    })

    // 添加影像图层
    const imageryLayer = new Cesium.ImageryLayer(imageryProvider)
    viewer.scene.imageryLayers.add(imageryLayer)
  } catch (error) {
    console.error('创建影像提供者失败:', error)
  }
}

// 1.默认飞中国
const defaultView = () => {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(103.8, 36.1, 25000000),
    duration: 2
  })
}
//2.加载中国边界线
const borderHandle = async () => {
  // 1. 加载国界和省界 (你原来的代码)
  const china = await Cesium.GeoJsonDataSource.load('/china.json', {
    stroke: Cesium.Color.YELLOW,
    fill: Cesium.Color.TRANSPARENT,
    strokeWidth: 2,
    clampToGround: true
  })
  viewer.dataSources.add(china)
  china.entities.values.forEach(entity => {
    if (entity.polygon) entity.polygon.height = 0
  })

  // 加载主要城市边界
  await loadCities()
}
const loadCities = async () => {
  // 假设你有一个需要展示的城市代码数组，例如北京、上海、广州的市级代码
  const cityCodes = ['110100', '310100', '440100']

  // 使用Promise.all并行加载所有选定的城市文件，提高效率
  const loadPromises = cityCodes.map(code =>
    Cesium.GeoJsonDataSource.load(`/geometryCouties/${code}.json`, {
      stroke: Cesium.Color.BLUE, // 城市边界用蓝色
      fill: Cesium.Color.TRANSPARENT,
      strokeWidth: 1, // 城市线比国界线细一些
      clampToGround: true
    }).then(dataSource => {
      viewer.dataSources.add(dataSource)
      // 同样需要设置高度，否则可能不显示
      dataSource.entities.values.forEach(entity => {
        if (entity.polygon) {
          entity.polygon.height = 0
        }
      })
      return dataSource
    })
  )

  // 等待所有城市加载完成
  await Promise.all(loadPromises)
  console.log('所有城市边界加载完成')
}

//3.hover效果
const hoverHandle = () => {
  let beijingEntity = null

  handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)

  cities.value.forEach(city => {
    const entityConfig = {
      name: city.name,
      position: Cesium.Cartesian3.fromDegrees(city.lon, city.lat),
      point: {
        pixelSize: 8,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2
      },
      label: {
        text: city.name,
        font: '16px sans-serif',
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        pixelOffset: new Cesium.Cartesian2(0, -20)
      }
    }

    if (city.name === '北京') {
      entityConfig.billboard = {
        image: whiteBg,
        scale: 0.01,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, 37),
        color: new Cesium.Color(1.0, 1.0, 1.0, 0.7),
        show: true
      }
    }

    const entity = viewer.entities.add(entityConfig)
    if (city.name === '北京') beijingEntity = entity
  })

  handler.setInputAction(movement => {
    const picked = viewer.scene.pick(movement.endPosition)

    if (
      picked &&
      picked.id &&
      cities.value.some(c => c.name === picked.id.name)
    ) {
      document.body.style.cursor = 'pointer'
      if (picked.id.name === '北京') {
        beijingEntity.billboard.show = true
        beijingEntity.billboard.scale = 0.03
        beijingEntity.billboard.color = new Cesium.Color(1.0, 1.0, 1.0, 1.0)
      } else {
        // 立刻隐藏北京提示图标
        beijingEntity.billboard.show = false
      }
    } else {
      document.body.style.cursor = 'default'
      // 鼠标移出地图也隐藏北京提示图标
      beijingEntity.billboard.show = false
    }
  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

  handler.setInputAction(click => {
    const picked = viewer.scene.pick(click.position)
    if (picked && picked.id && picked.id.name === '北京') {
      // 点击反馈
      const originalScale = beijingEntity.billboard.scale
      beijingEntity.billboard.scale = originalScale * 1.3
      setTimeout(() => {
        beijingEntity.billboard.scale = originalScale
      }, 150)

      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(116.47, 40.13, 5000),
        duration: 2
      })

      setTimeout(() => {
        router.push('/three')
      }, 3000)
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
}

const firstHandle = () => {
  const key = 'hasShown3DNotification'
  if (!localStorage.getItem(key)) {
    ElNotification({
      title: 'Success',
      message: '恭喜，你已进入3d世界！',
      type: 'success'
    })
    localStorage.setItem(key, 'true')
  }
}

onMounted(async () => {
  firstHandle()
  await init()
  defaultView()
  await borderHandle()
  hoverHandle()
})

onBeforeUnmount(() => {
  if (viewer) viewer.destroy()
  if (handler) handler.destroy()
})
</script>

<style scoped lang="less">
#cesiumContainer {
  width: 100%;
  height: calc(100vh - 75px);
  overflow: hidden;
}

.preview-overlay {
  position: absolute;
  bottom: 30px; // 距离底部
  left: 50%;
  transform: translateX(-50%) translateY(20px); // 初始微下移
  z-index: 1000;
  pointer-events: none; // 避免阻挡鼠标操作
  opacity: 0;
  transition: all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1); // 平滑动画
  display: block;

  img {
    width: 220px; // 略微放大
    max-width: 80vw; // 响应式
    height: auto;
    border-radius: 12px;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
    transform: scale(0.95);
    transition: all 0.35s ease-in-out;
  }

  // 当显示时
  &.active {
    opacity: 1;
    transform: translateX(-50%) translateY(0);

    img {
      transform: scale(1);
    }
  }
}
</style>
