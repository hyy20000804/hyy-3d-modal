import {
  Cache,
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Color,
  AxesHelper
} from 'three'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer' // 二维标签渲染器
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer' // 三维标签渲染器
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'three/examples/jsm/libs/stats.module'
import SkyBoxs from './SkyBoxs'
import Lights from './Lights'
import ThreeMouseEvent from './ThreeMouseEvent'

// 文件顶部新增
function isWebGLAvailable () {
  try {
    const canvas = document.createElement('canvas')
    return !!window.WebGLRenderingContext && !!canvas.getContext('webgl')
  } catch (e) {
    return false
  }
}

export default class Viewer {
  /**
   *
   * @param {*} id 场景容器id
   */

  constructor (id) {
    Cache.enabled = true
    this.id = id

    if (!isWebGLAvailable()) {
      console.warn('当前浏览器或设备不支持 WebGL，将退出 Viewer 初始化')
      const dom = document.getElementById(id)
      if (dom) {
        dom.innerHTML = `
			<div style="color: white; font-size: 14px; padding: 20px;">
			  当前设备暂不支持 3D 浏览，请更新 iOS 系统或更换浏览器。
			</div>
		  `
      }
      return
    }

    this.renderer = undefined
    this.scene = undefined
    this.camera = undefined
    this.controls = undefined
    this.animateEventList = []

    this._animationId = null // 保存动画帧ID

    // 绑定 resize 回调，保证 removeEventListener 能成功解绑
    this._boundHandleResize = this._handleResize.bind(this)

    this.#initViewer()
  }

  #initViewer () {
    this.#initRenderer()
    this.#initCamera()
    this.#initScene()
    this.#initControl()
    this.#initSkybox()
    this.#initLight()

    let lastTime = 0
    const animate = time => {
      this._animationId = requestAnimationFrame(animate)
      if (!this.controls || !this.camera || !this.renderer) return
      if (time - lastTime < 33) return
      lastTime = time

      this.#updateDom()
      this.#renderDom()
      this.animateEventList.forEach(event => {
        event.fun && event.content && event.fun(event.content)
      })
    }

    animate()

    window.addEventListener('resize', () => {
      const width = this.viewerDom?.clientWidth || 0
      const height = this.viewerDom?.clientHeight || 0

      if (
        !this.renderer ||
        !this.camera ||
        !this.labelRenderer ||
        !this.css3DRenderer
      )
        return

      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()

      this.renderer.setSize(width, height)
      this.labelRenderer.setSize(width, height)
      this.css3DRenderer.setSize(width, height)
    })
  }

  /**
   * 添加坐标轴
   */
  addAxis () {
    // 显示坐标轴(x轴: 红色; y轴: 绿色; z轴: 蓝色)
    // x轴水平方向(右正); y轴垂直方向(上正); z轴垂直xy平面即屏幕(外正)
    this.scene.add(new AxesHelper(100))
  }
  /**
   * 添加状态检测
   */
  addStats () {
    if (!this.statsControls) {
      this.statsControls = new Stats()
    }
    this.statsControls.dom.style.position = 'absolute'
    this.viewerDom.appendChild(this.statsControls.dom)
    // 添加到动画
    this.statsUpdateObj = {
      fun: this.#statsUpdate,
      content: this.statsControls
    }
    this.addAnimate(this.statsUpdateObj)
  }
  /**
   * 移除状态检测
   */
  removeStats () {
    if (this.statsControls && this.statsUpdateObj) {
      this.viewerDom.removeChild(this.statsControls.dom)
      this.removeAnimate(this.statsUpdateObj)
    }
  }
  #statsUpdate (statsControls) {
    statsControls.update()
  }
  /**
   * 更新DOM
   */
  #updateDom () {
    if (!this.renderer || !this.camera || !this.controls) return
    this.controls.update()

    const width = this.viewerDom?.clientWidth || 0
    const height = this.viewerDom?.clientHeight || 0

    if (!width || !height) return

    if (this._lastWidth !== width || this._lastHeight !== height) {
      this._lastWidth = width
      this._lastHeight = height

      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()

      if (this.renderer && this.labelRenderer && this.css3DRenderer) {
        this.renderer.setSize(width, height)
        this.labelRenderer.setSize(width, height)
        this.css3DRenderer.setSize(width, height)
      }
    }
  }

  #renderDom () {
    this.renderer.render(this.scene, this.camera)

    this.labelRenderer.render(this.scene, this.camera) // 渲染2d标签场景
    this.css3DRenderer.render(this.css3dScene, this.camera) // 渲染3d标签场景
  }
  /**
   * 创建初始化场景界面
   */
  #initRenderer () {
    this.viewerDom = document.getElementById(this.id)

    // WebGL Renderer 降级处理
    this.renderer = new WebGLRenderer({
      antialias: true, // 关闭抗锯齿
      alpha: true,
      precision: 'mediump', // 降低精度兼容 iOS
      premultipliedAlpha: false
    })
    this.renderer.clearDepth()
    this.renderer.shadowMap.enabled = false // 关闭阴影提升性能
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1)) // 限制 DPR，防止内存溢出
    this.viewerDom.appendChild(this.renderer.domElement)

    // 二维标签
    this.labelRenderer = new CSS2DRenderer()
    this.labelRenderer.domElement.style.zIndex = 2
    this.labelRenderer.domElement.style.position = 'absolute'
    this.labelRenderer.domElement.style.top = '0px'
    this.labelRenderer.domElement.style.left = '0px'
    this.labelRenderer.domElement.style.pointerEvents = 'none'
    this.viewerDom.appendChild(this.labelRenderer.domElement)

    // 三维标签
    this.css3DRenderer = new CSS3DRenderer()
    this.css3DRenderer.domElement.style.zIndex = 0
    this.css3DRenderer.domElement.style.position = 'absolute'
    this.css3DRenderer.domElement.style.top = '0px'
    this.css3DRenderer.domElement.style.left = '0px'
    this.css3DRenderer.domElement.style.pointerEvents = 'none'
    this.viewerDom.appendChild(this.css3DRenderer.domElement)

    // this.renderer.setScissorTest(true) // 开启剪裁可提升性能（可选）
    this.renderer.autoClear = false // 防止每帧重复清空，减轻内存压力
  }
  /**
   * 渲染相机
   */
  #initCamera () {
    this.camera = new PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      500000
    ) // 透视相机
    this.camera.position.set(50, 0, 50) // 相机位置
    this.camera.lookAt(0, 0, 0) // 设置相机方向
  }
  /**
   * 渲染场景
   */
  #initScene () {
    this.scene = new Scene()
    this.css3dScene = new Scene()
    this.scene.background = new Color('rgb(5,24,38)')
  }
  /**
   * 初始化控制
   */
  #initControl () {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = false // 是否开启阻尼
    this.controls.screenSpacePanning = false // 定义当平移的时候摄像机的位置将如何移动, 摄像机将在与摄像机向上方向垂直的平面中平移
  }
  /**
   * 初始化天空盒
   */
  #initSkybox () {
    if (!this.skyboxs) {
      this.skyboxs = new SkyBoxs(this)
    }
    this.skyboxs.setSkybox()
  }
  /**
   * 初始化灯光
   */
  #initLight () {
    if (!this.lights) {
      this.lights = new Lights(this)
    }
  }
  /**
	   * 添加全局的动画事件
	   * @param animate 函数加参数对象
	   * 传入对象 = {
			  fun: 函数名称,
			  content: 函数参数
		  }
	   */
  addAnimate (animate) {
    this.animateEventList.push(animate)
  }
  /**
	  * 移除全局的动画事件
	  * @param animate 函数加参数对象
	  * 传入对象 = {
			 fun: 函数名称,
			 content: 函数参数
		 }
	  */
  removeAnimate (animate) {
    this.animateEventList.map((val, i) => {
      if (val === animate) this.animateEventList.splice(i, 1)
    })
  }
  /**
   * 开启鼠标事件
   * @param {*} mouseType 鼠标类型
   * @param {*} isSelect 是否选中
   * @param {*} callback 鼠标回调
   */
  startSelectEvent (mouseType, isSelect, callback) {
    if (!this.mouseEvent) {
      this.mouseEvent = new ThreeMouseEvent(this, isSelect, callback, mouseType)
    }
    this.mouseEvent.startSelect()
  }
  /**
   * 关闭鼠标事件
   */
  stopSelectEvent () {
    this.mouseEvent?.stopSelect()
  }

  _handleResize () {
    const width = this.viewerDom.clientWidth
    const height = this.viewerDom.clientHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height)
    this.labelRenderer.setSize(width, height)
    this.css3DRenderer.setSize(width, height)
  }

  // 新增销毁函数
  // Viewer 类的 dispose 方法示例
  dispose () {
    // 取消动画帧
    if (this._animationId) {
      cancelAnimationFrame(this._animationId)
      this._animationId = null
    }

    // 移除监听器
    window.removeEventListener('resize', this._boundHandleResize)

    // 控制器销毁
    if (this.controls) {
      this.controls.dispose()
      this.controls = null
    }

    // 释放渲染器上下文
    if (this.renderer) {
      this.renderer.dispose()
      this.renderer.forceContextLoss()
      this.renderer.context = null
      this.renderer.domElement = null
      this.renderer = null
    }

    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.removeEventListener(
        'click',
        this._boundClickHandler
      )
    }

    // 销毁标签渲染器（CSS2DRenderer, CSS3DRenderer）
    if (this.labelRenderer) {
      if (this.labelRenderer.domElement && this.viewerDom) {
        this.viewerDom.removeChild(this.labelRenderer.domElement)
      }
      this.labelRenderer = null
    }

    if (this.css3DRenderer) {
      if (this.css3DRenderer.domElement && this.viewerDom) {
        this.viewerDom.removeChild(this.css3DRenderer.domElement)
      }
      this.css3DRenderer = null
    }

    // 释放场景中的资源（几何体、材质、纹理）
    if (this.scene) {
      this.scene.traverse(obj => {
        if (obj.geometry) {
          obj.geometry.dispose()
        }
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => {
              if (m.map) m.map.dispose()
              m.dispose()
            })
          } else {
            if (obj.material.map) obj.material.map.dispose()
            obj.material.dispose()
          }
        }
      })

      // 清空场景中的所有对象
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0])
      }

      this.scene = null
    }

    // 3D标签场景也清理
    if (this.css3dScene) {
      while (this.css3dScene.children.length > 0) {
        this.css3dScene.remove(this.css3dScene.children[0])
      }
      this.css3dScene = null
    }

    // 清空动画事件
    this.animateEventList = []
  }
}
