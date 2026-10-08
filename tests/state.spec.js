import assert from 'assert';
import { AppState } from '../js/state/AppState.js';
import { AlgorithmType, AppStatus } from '../js/core/Types.js';

console.log('Testing AppState FSM...');

const state = new AppState();
state.init('AGTC', 'AGTC', AlgorithmType.NEEDLEMAN_WUNSCH);
assert.strictEqual(state.status, AppStatus.INITIALIZED);
assert.strictEqual(state.cellOrder.length, 16);
assert.strictEqual(state.currentStepIndex, -1);

// Paso adelante
const fwd1 = state.stepForward();
assert.strictEqual(fwd1, true);
assert.strictEqual(state.currentStepIndex, 0);
assert.strictEqual(state.status, AppStatus.COMPUTING);

// Paso atrás
const back1 = state.stepBackward();
assert.strictEqual(back1, true);
assert.strictEqual(state.currentStepIndex, -1);
assert.strictEqual(state.status, AppStatus.INITIALIZED);

// Cálculo instantáneo
state.instantCompute();
assert.strictEqual(state.status, AppStatus.FINISHED);
assert.strictEqual(state.optimalPaths.length, 1);
assert.strictEqual(state.optimalPaths[0].alignment_s1, 'AGTC');
assert.strictEqual(state.optimalPaths[0].alignment_s2, 'AGTC');
assert.strictEqual(state.optimalPaths[0].score, 4);

// Matriz aplanada
const flat = state.getFlatMatrix();
assert.strictEqual(flat.length, 25); // (4+1) * (4+1)

// Reinicio
state.reset();
assert.strictEqual(state.status, AppStatus.INITIALIZED);
assert.strictEqual(state.currentStepIndex, -1);

// Caso asimétrico TC4
state.init('ACGTACGT', 'CG', AlgorithmType.NEEDLEMAN_WUNSCH);
state.instantCompute();
assert.strictEqual(state.optimalPaths[0].alignment_s1, 'ACGTACGT');
assert.strictEqual(state.optimalPaths[0].alignment_s2, '-----CG-');
assert.strictEqual(state.optimalPaths[0].score, -10);

// Prueba b) stepBackward() desde el estado FINISHED limpia optimalPaths y regresa a COMPUTING
console.log('Verifying: stepBackward() from FINISHED state (instantCompute)...');
const finishState = new AppState();
let lastEventType = null;
let lastPayload = null;
finishState.subscribe((st, evt, payload) => {
  lastEventType = evt;
  lastPayload = payload;
});

finishState.init('AAG', 'AAG', AlgorithmType.NEEDLEMAN_WUNSCH);
finishState.instantCompute();
assert.strictEqual(finishState.status, AppStatus.FINISHED);
assert.strictEqual(finishState.optimalPaths.length, 1);
assert.strictEqual(finishState.getActivePathCoordinates().length > 0, true);

const steppedBack = finishState.stepBackward();
assert.strictEqual(steppedBack, true, 'stepBackward must succeed from FINISHED');
assert.strictEqual(finishState.status, AppStatus.COMPUTING, 'Status must return to COMPUTING after stepBackward from FINISHED');
assert.deepStrictEqual(finishState.optimalPaths, [], 'optimalPaths must be empty array after stepBackward from FINISHED');
assert.strictEqual(finishState.getActivePathCoordinates().length, 0, 'Active path coordinates must be empty');
assert.strictEqual(lastEventType, 'STEP_BACKWARD', 'Event type must be STEP_BACKWARD');
assert.strictEqual(lastPayload.wasFinished, true, 'Event payload wasFinished must be true');

// Asegurar que la última celda en el motor haya quedado restablecida a null
const lastCoord = finishState.cellOrder[finishState.cellOrder.length - 1];
assert.strictEqual(finishState.engine.matrix[lastCoord.i][lastCoord.j], null, 'Last cell in engine must be null');
assert.strictEqual(finishState.engine.directions[lastCoord.i][lastCoord.j], 0, 'Last cell directions must be 0');
assert.strictEqual(finishState.engine.cellDetails[lastCoord.i][lastCoord.j], null, 'Last cell details must be null');
console.log('  [PASS] stepBackward() after instantCompute()');

// Probar también stepBackward() después de alcanzar FINISHED mediante stepForward()
console.log('Verifying: stepBackward() from FINISHED state (via stepForward)...');
const stepState = new AppState();
stepState.init('AA', 'A', AlgorithmType.NEEDLEMAN_WUNSCH); // 2 celdas: (1,1) y (2,1)
stepState.stepForward(); // celda 1
assert.strictEqual(stepState.status, AppStatus.COMPUTING);
stepState.stepForward(); // celda 2 (final)
assert.strictEqual(stepState.status, AppStatus.FINISHED);
assert(stepState.optimalPaths.length >= 1);

const steppedBackStep = stepState.stepBackward();
assert.strictEqual(steppedBackStep, true);
assert.strictEqual(stepState.status, AppStatus.COMPUTING);
assert.deepStrictEqual(stepState.optimalPaths, []);
assert.strictEqual(stepState.getActivePathCoordinates().length, 0);
console.log('  [PASS] stepBackward() after stepForward() completion');

console.log('AppState FSM tests PASSED!');

// Probar valores en español de la enumeración AppStatus
console.log('Verifying: Spanish AppStatus values...');
assert.strictEqual(AppStatus.INITIALIZED, 'Inicializado');
assert.strictEqual(AppStatus.COMPUTING, 'Calculando...');
assert.strictEqual(AppStatus.MATRIX_DONE, 'Matriz Calculada');
assert.strictEqual(AppStatus.FINISHED, 'Terminado');
assert.strictEqual(AppStatus.PAUSED, 'Pausado');
console.log('  [PASS] Spanish AppStatus values verified');

// Probar comportamiento de pausa en autoRun y ejecución inmediata del primer paso
console.log('Verifying: AutoRun PAUSED state and immediate first step...');
const pauseState = new AppState();
pauseState.init('AG', 'AG', AlgorithmType.NEEDLEMAN_WUNSCH);
assert.strictEqual(pauseState.status, AppStatus.INITIALIZED);
assert.strictEqual(pauseState.currentStepIndex, -1);
pauseState.startAutoRun();
assert.strictEqual(pauseState.currentStepIndex, 0, 'First step must be calculated immediately on startAutoRun');
assert.strictEqual(pauseState.status, AppStatus.COMPUTING);
pauseState.stopAutoRun();
assert.strictEqual(pauseState.status, AppStatus.PAUSED);
console.log('  [PASS] AutoRun PAUSED state and immediate first step verified');

// Probar límites de ajuste de velocidad setSpeed [200ms, 3000ms]
console.log('Verifying: setSpeed clamping (min 200ms, max 3000ms)...');
const speedState = new AppState();
assert.strictEqual(speedState.speedMs, 200);
speedState.setSpeed(50);
assert.strictEqual(speedState.speedMs, 200, 'Speed must clamp to minimum 200ms');
speedState.setSpeed(1500);
assert.strictEqual(speedState.speedMs, 1500);
speedState.setSpeed(3000);
assert.strictEqual(speedState.speedMs, 3000);
speedState.setSpeed(5000);
assert.strictEqual(speedState.speedMs, 3000, 'Speed must clamp to maximum 3000ms');
console.log('  [PASS] setSpeed clamping verified');

