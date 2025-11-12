// --- Three.js Инициализация ---
let scene, camera, renderer, controls;
let player, goalkeeper, stadium, ball;
let ballTrajectory = [];
let isDragging = false;
let dragStart, dragEnd;

// --- HTTP-ссылки на 3D-модели ---
const MODELS = {
  player: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Duck/glTF/Duck.gltf', // Пример: замените на реальную модель футболиста
  goalkeeper: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/Duck/glTF/Duck.gltf', // Пример: замените на вратаря
  stadium: 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@master/2.0/DamagedHelmet/glTF/DamagedHelmet.gltf' // Пример: замените на стадион
};

// --- Игровые переменные ---
let score = { player: 0, goalkeeper: 0 };
let clock = new THREE.Clock();

// --- Инициализация сцены ---
function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87CEEB); // Небо

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 10);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.getElementById('gameContainer').appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // --- Освещение ---
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(10, 20, 15);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // --- Земля ---
  const groundGeometry = new THREE.PlaneGeometry(30, 30);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x2E8B57, roughness: 0.8 });
  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // --- Ворота ---
  const goalGeometry = new THREE.BoxGeometry(7.2, 2.4, 0.2);
  const goalMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const goal = new THREE.Mesh(goalGeometry, goalMaterial);
  goal.position.set(0, 1.2, -14);
  goal.castShadow = true;
  scene.add(goal);

  // --- Загрузка моделей ---
  const loader = new THREE.GLTFLoader();

  loader.load(MODELS.stadium, (gltf) => {
    stadium = gltf.scene;
    stadium.scale.set(0.1, 0.1, 0.1);
    stadium.position.set(0, 0, 0);
    scene.add(stadium);
  });

  loader.load(MODELS.player, (gltf) => {
    player = gltf.scene;
    player.scale.set(0.5, 0.5, 0.5);
    player.position.set(0, 0, -10);
    player.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
      }
    });
    scene.add(player);
  });

  loader.load(MODELS.goalkeeper, (gltf) => {
    goalkeeper = gltf.scene;
    goalkeeper.scale.set(0.5, 0.5, 0.5);
    goalkeeper.position.set(0, 0, -13.5);
    goalkeeper.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
      }
    });
    scene.add(goalkeeper);
  });

  // --- Мяч ---
  const ballGeometry = new THREE.SphereGeometry(0.3, 32, 32);
  const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
  ball = new THREE.Mesh(ballGeometry, ballMaterial);
  ball.position.set(0, 0.3, -10);
  ball.castShadow = true;
  scene.add(ball);

  // --- Обработчики мыши ---
  window.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  // --- Кнопка удара ---
  document.getElementById('shootBtn').addEventListener('click', shoot);

  // --- Анимация ---
  animate();
}

// --- Логика мыши ---
function onMouseDown(event) {
  isDragging = true;
  dragStart = { x: event.clientX, y: event.clientY };
  ballTrajectory = [];
}

function onMouseMove(event) {
  if (isDragging) {
    dragEnd = { x: event.clientX, y: event.clientY };
    // Визуализация траектории (упрощённо)
    const dx = (dragEnd.x - dragStart.x) * 0.01;
    const dz = (dragEnd.y - dragStart.y) * 0.01;
    ball.position.x = dx;
    ball.position.z = -10 + dz;
  }
}

function onMouseUp() {
  isDragging = false;
}

// --- Логика удара ---
function shoot() {
  if (!player || !goalkeeper) return;

  // Направление выстрела
  const dx = (dragEnd ? dragEnd.x - dragStart.x : 0) * 0.01;
  const dz = (dragEnd ? dragEnd.y - dragStart.y : 0) * 0.01;

  // Анимация мяча
  animateBall(dx, dz);

  // Прыжок вратаря
  animateGoalkeeper(dx, dz);
}

function animateBall(dx, dz) {
  const targetX = dx * 5; // Масштабируем
  const targetZ = -14;
  const duration = 1000; // ms
  const startTime = Date.now();

  function update() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    ball.position.x = 0 + dx * 5 * progress;
    ball.position.z = -10 + (targetZ - (-10)) * progress;
    ball.position.y = 0.3 + Math.sin(progress * Math.PI) * 2; // Парабола

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      // Проверка гола
      checkGoal(dx, dz);
    }
  }
  update();
}

function animateGoalkeeper(dx, dz) {
  // Вратарь случайно прыгает влево/вправо/вверх
  const directions = ['left', 'right', 'center'];
  const randomDirection = directions[Math.floor(Math.random() * directions.length)];

  if (goalkeeper) {
    goalkeeper.position.x = (randomDirection === 'left' ? -1 : randomDirection === 'right' ? 1 : 0);
  }

  // Возвращение в центр через 1.5 секунды
  setTimeout(() => {
    if (goalkeeper) goalkeeper.position.x = 0;
  }, 1500);
}

function checkGoal(dx, dz) {
  // Упрощённая проверка: если направление выстрела не совпадает с направлением прыжка вратаря
  const shotX = Math.abs(dx * 5);
  const keeperX = Math.abs(goalkeeper.position.x);

  if (Math.abs(shotX - keeperX) > 0.5) { // Порог совпадения
    score.player++;
    alert('GOAL!');
  } else {
    score.goalkeeper++;
    alert('SAVED!');
  }
  updateScore();
}

function updateScore() {
  document.getElementById('score').textContent = `Score: ${score.player} - ${score.goalkeeper}`;
}

// --- Основной цикл ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// --- Запуск ---
window.onload = init;

// --- Адаптация под размер окна ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
