import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import GUI from "lil-gui";

class RealisticRender {
  constructor() {
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    this.initLoaders();
    this.createScene();
    this.setupCamera();
    this.setupLights();
    this.setupRenderer();
    this.setupControls();
    this.setupGUI();
    this.loadEnvironment();
    this.loadModel();
    this.setupEventListeners();
    this.startAnimationLoop();
  }

  initLoaders() {
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.cubeTextureLoader = new THREE.CubeTextureLoader();

    // Draco Loader setup
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath("/static/draco/");
    this.dracoLoader.setDecoderConfig({ type: "js" });
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }

  createScene() {
    this.canvas = document.querySelector("canvas.webgl");
    this.scene = new THREE.Scene();

    // Scene settings
    this.scene.environmentIntensity = 1;
    this.scene.backgroundBlurriness = 0;
    this.scene.backgroundIntensity = 1;
    this.scene.backgroundRotation.y = 5;
    this.scene.environmentRotation.y = 5;
  }

  loadEnvironment() {
    this.environmentMap = this.cubeTextureLoader.load([
      "/static/environmentMaps/beachEnv/px.png",
      "/static/environmentMaps/beachEnv/nx.png",
      "/static/environmentMaps/beachEnv/py.png",
      "/static/environmentMaps/beachEnv/ny.png",
      "/static/environmentMaps/beachEnv/pz.png",
      "/static/environmentMaps/beachEnv/nz.png",
    ]);

    this.scene.background = this.environmentMap;
    this.scene.environment = this.environmentMap;
  }

  loadModel() {
    // Load ground textures
    const color = this.textureLoader.load("/static/textures/ground/diff.jpg");
    const ambientOcclusion = this.textureLoader.load(
      "/static/textures/ground/ao.jpg"
    );
    const normal = this.textureLoader.load(
      "/static/textures/ground/normal.jpg"
    );
    const roughness = this.textureLoader.load(
      "/static/textures/ground/rough.jpg"
    );
    const metalness = this.textureLoader.load(
      "/static/textures/ground/arm.jpg"
    );
    const height = this.textureLoader.load("/static/textures/ground/disp.jpg");

    color.colorSpace = THREE.SRGBColorSpace;

    this.gltfLoader.load("/static/models/turtle_compressed.glb", (gltf) => {
      this.turtle = gltf.scene;
      this.scene.add(this.turtle);

      this.turtle.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.createGround(
        color,
        ambientOcclusion,
        normal,
        roughness,
        metalness,
        height
      );
    });
  }

  createGround(color, ambientOcclusion, normal, roughness, metalness, height) {
    const boundingBox = new THREE.Box3().setFromObject(this.turtle);

    const groundMaterial = new THREE.MeshStandardMaterial({
      map: color,
      aoMap: ambientOcclusion,
      normalMap: normal,
      roughnessMap: roughness,
      metalnessMap: metalness,
      displacementMap: height,
      displacementScale: 0.15,
    });

    const groundGeometry = new THREE.PlaneGeometry(15, 15, 100, 100);
    groundGeometry.setAttribute(
      "uv2",
      new THREE.BufferAttribute(groundGeometry.attributes.uv.array, 2)
    );

    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.receiveShadow = true;
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = boundingBox.min.y - 0.05;

    this.scene.add(this.ground);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.sizes.width / this.sizes.height,
      0.1,
      100
    );
    this.camera.position.set(-0.5, 0.75, 3);
    this.scene.add(this.camera);
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
  }

  setupLights() {
    // Directional Light
    this.directionalLight = new THREE.DirectionalLight("#835520", 10);
    this.directionalLight.position.set(-10, 10, -3);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.mapSize.set(512, 512);
    this.directionalLight.shadow.bias = -0.005;
    this.scene.add(this.directionalLight);

    // Ambient Light
    this.ambientLight = new THREE.AmbientLight("#8a8a8a", 1);
    this.scene.add(this.ambientLight);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  setupGUI() {
    this.gui = new GUI();
    this.setupSceneSettingsGUI();
    this.setupLightingGUI();
    this.setupRendererGUI();
  }

  setupSceneSettingsGUI() {
    const sceneFolder = this.gui.addFolder("Scene Settings");
    sceneFolder
      .add(this.scene, "environmentIntensity")
      .min(0)
      .max(10)
      .step(0.001)
      .name("Environment Intensity");
    sceneFolder
      .add(this.scene, "backgroundBlurriness")
      .min(0)
      .max(1)
      .step(0.001)
      .name("Background Blurriness");
    sceneFolder
      .add(this.scene, "backgroundIntensity")
      .min(0)
      .max(10)
      .step(0.001)
      .name("Background Intensity");

    const environmentRotationFolder = sceneFolder.addFolder(
      "Environment Rotation"
    );
    environmentRotationFolder
      .add(this.scene.backgroundRotation, "y")
      .min(0)
      .max(Math.PI * 2)
      .step(0.001)
      .name("Background Rotation Y");
    environmentRotationFolder
      .add(this.scene.environmentRotation, "y")
      .min(0)
      .max(Math.PI * 2)
      .step(0.001)
      .name("Environment Rotation Y");
  }

  setupLightingGUI() {
    const lightFolder = this.gui.addFolder("Lighting");
    this.guiControls = {
      directionalColor: "#835520",
      ambientColor: "#8a8a8a",
      spotlightColor: "#ffffff",
    };

    this.setupDirectionalLightGUI(lightFolder);
    this.setupAmbientLightGUI(lightFolder);
  }

  setupDirectionalLightGUI(lightFolder) {
    const directionalFolder = lightFolder.addFolder("Directional Light");
    directionalFolder
      .add(this.directionalLight, "intensity")
      .min(0)
      .max(10)
      .step(0.001)
      .name("Intensity");
    directionalFolder
      .add(this.directionalLight.position, "x")
      .min(-20)
      .max(20)
      .step(0.001)
      .name("Position X");
    directionalFolder
      .add(this.directionalLight.position, "y")
      .min(-20)
      .max(20)
      .step(0.001)
      .name("Position Y");
    directionalFolder
      .add(this.directionalLight.position, "z")
      .min(-20)
      .max(20)
      .step(0.001)
      .name("Position Z");

    directionalFolder
      .addColor(this.guiControls, "directionalColor")
      .name("Color")
      .onChange((value) => {
        this.directionalLight.color.set(value);
      });
  }

  setupAmbientLightGUI(lightFolder) {
    const ambientFolder = lightFolder.addFolder("Ambient Light");
    ambientFolder
      .add(this.ambientLight, "intensity")
      .min(0)
      .max(2)
      .step(0.001)
      .name("Intensity");

    ambientFolder
      .addColor(this.guiControls, "ambientColor")
      .name("Color")
      .onChange((value) => {
        this.ambientLight.color.set(value);
      });
  }

  setupRendererGUI() {
    const rendererFolder = this.gui.addFolder("Renderer Settings");
    rendererFolder
      .add(this.renderer, "toneMapping", {
        No: THREE.NoToneMapping,
        Linear: THREE.LinearToneMapping,
        Reinhard: THREE.ReinhardToneMapping,
        Cineon: THREE.CineonToneMapping,
        ACESFilmic: THREE.ACESFilmicToneMapping,
      })
      .name("Tone Mapping");

    rendererFolder
      .add(this.renderer, "toneMappingExposure")
      .min(0.1)
      .max(10)
      .step(0.001)
      .name("Tone Mapping Exposure");
  }

  setupEventListeners() {
    window.addEventListener("resize", () => {
      // Update sizes
      this.sizes.width = window.innerWidth;
      this.sizes.height = window.innerHeight;

      // Update camera
      this.camera.aspect = this.sizes.width / this.sizes.height;
      this.camera.updateProjectionMatrix();

      // Update renderer
      this.renderer.setSize(this.sizes.width, this.sizes.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
  }

  startAnimationLoop() {
    const clock = new THREE.Clock();
    const tick = () => {
      const elapsedTime = clock.getElapsedTime();
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      window.requestAnimationFrame(tick);
    };
    tick();
  }

  // Method to initialize the scene
  static init() {
    return new RealisticRender();
  }
}

// Initialize the scene
RealisticRender.init();
