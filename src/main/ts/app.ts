﻿let ORIENTATION_TRANSFORMATIONS: { [_: number]: IOrientationTransformation };

window.onload = function () {

    ORIENTATION_TRANSFORMATIONS = initOrientationTransformations();

    let minTiles = 250;
    let tileMargin = 0.05;

    let matrixPopulators: { [_: number]: ILevelPlayMatrixPopulator[] } = {};

    let wallEntityType: IEntityType = {
        backgroundColor: '#AA9',
        bold: true,
        character: 'x',
        classification: CLASSIFICATION_WALL,
        foregroundColor: '#998',
        speed: 0,
        children: [],
        collisionHandlers: []
    };

    matrixPopulators[CLASSIFICATION_WALL] = [
        levelPlayMatrixPopulatorBoundaryProxyFactory(levelPlayMatrixPopulatorFillerProxyFactory(levelPlayMatrixPopulatorRectangleFactory(minTiles, false, 0, false)), wallEntityType),
        levelPlayMatrixPopulatorBoundaryProxyFactory(levelPlayMatrixPopulatorFillerProxyFactory(levelPlayMatrixPopulatorRectangleFactory(minTiles, false, 0, true)), wallEntityType),
        levelPlayMatrixPopulatorBoundaryProxyFactory(levelPlayMatrixPopulatorFillerProxyFactory(levelPlayMatrixPopulatorRectangleFactory(minTiles, false, 0.2, false)), wallEntityType),
        levelPlayMatrixPopulatorBoundaryProxyFactory(levelPlayMatrixPopulatorFillerProxyFactory(levelPlayMatrixPopulatorRectangleFactory(minTiles, false, 0.5, true)), wallEntityType),
        levelPlayMatrixPopulatorBoundaryProxyFactory(levelPlayMatrixPopulatorFillerProxyFactory(levelPlayMatrixPopulatorRectangleFactory(minTiles, true, 0, false)), wallEntityType),
        levelPlayMatrixPopulatorBoundaryProxyFactory(levelPlayMatrixPopulatorFillerProxyFactory(levelPlayMatrixPopulatorRectangleFactory(minTiles, true, 0, true)), wallEntityType)
    ];

    function monsterFilterFactory(padding: number) {
        return function (entityDescriptions: ILevelPlayEntityDescription[], matrix: ILevelPlayMatrix<ILevelPlayEntityDescription[]>, x: number, y: number) {
            if (x < padding || x >= matrix.width - padding || y < padding || y >= matrix.height - padding) {
                return false;
            } else {
                for (let entityDescription of entityDescriptions) {
                    if (entityDescription.type.classification == CLASSIFICATION_WALL || entityDescription.type.classification == CLASSIFICATION_OBSTACLE) {
                        return false;
                    }
                }
            }
            return true;
        };
    }

    matrixPopulators[CLASSIFICATION_MONSTER] = [
        levelPlayMatrixPopulatorFloodFillFactory(6, 1, 1, 0, 40, monsterFilterFactory(2))
    ];
    matrixPopulators[CLASSIFICATION_COLLECTABLE_COMMON] = [
        levelPlayMatrixPopulatorFloodFillFactory(1, 0, minTiles, 0, 20, monsterFilterFactory(1))
    ]

    var playerInputs: { [_: number]: IInputAtomic } = {};
    playerInputs[INPUT_ATOMIC_ID_UP] = {};
    playerInputs[INPUT_ATOMIC_ID_DOWN] = {};
    playerInputs[INPUT_ATOMIC_ID_LEFT] = {};
    playerInputs[INPUT_ATOMIC_ID_RIGHT] = {};
    playerInputs[INPUT_ATOMIC_ID_ACTION] = {};

    var levelPlayMindUpdateHandlers: { [_: number]: ILevelPlayEntityMindUpdateFunction } = {};
    levelPlayMindUpdateHandlers[MIND_PLAYER_1] = levelPlayEntityMindPlayerUpdateFactory(
        tileMargin,
        playerInputs,
        INPUT_ATOMIC_ID_UP,
        INPUT_ATOMIC_ID_DOWN,
        INPUT_ATOMIC_ID_LEFT,
        INPUT_ATOMIC_ID_RIGHT
    );
    levelPlayMindUpdateHandlers[MIND_MONSTER] = levelPlayEntityMindMonsterUpdateFactory();
    // do nothing
    levelPlayMindUpdateHandlers[MIND_INERT] = <any>function () { };

    var levelPlayMindHandler = recordHandlerDelegateFactory(levelPlayMindUpdateHandlers);

    var contentElement = document.body;

    var introElement = document.getElementById('intro');
    var introPlayButton = document.getElementById('intro_play_button');
    var introRestartButton = document.getElementById('intro_restart_button');

    var levelPlayElement = <HTMLCanvasElement>document.getElementById('level_play');
    var levelPlayContext = levelPlayElement.getContext('2d');

    var initHandlers: { [_: number]: IRecordHandlerFunction<StateKey, IRecord<State>> } = {};
    initHandlers[STATE_INTRO] = introInit;
    initHandlers[STATE_LEVEL_PLAY] = levelPlayInitFactory(
        tileMargin * 4, 
        matrixPopulators,
        contentElement,
        levelPlayElement,
        levelPlayContext,
        minTiles,
        7
    );
    var initHandler = recordHandlerDelegateFactory(initHandlers);

    var startHandlers: { [_: number]: IRecordHandlerFunction<State, IRecord<StateRunner>> } = {};
    var introStart = introStartFactory(introElement, introPlayButton, introRestartButton);
    startHandlers[STATE_INTRO] = introStart;
    startHandlers[STATE_LEVEL_PLAY] = levelPlayStartFactory(
        levelPlayElement,
        levelPlayContext,
        levelPlayMindHandler,
        playerInputs,
        5,
        easingInit(), 
        effectInit()
    );
    var startHandler = recordHandlerDelegateFactory(startHandlers);

    var stopHandlers: { [_: number]: IRecordHandlerFunction<StateRunner, void> } = {};
    stopHandlers[STATE_INTRO] = defaultStateStopFunctionFactory(introElement);
    stopHandlers[STATE_LEVEL_PLAY] = levelPlayStopFactory(levelPlayElement);
    var stopHandler = recordHandlerDelegateFactory(stopHandlers);

    var callback: IStateCompleteCallback = function (nextStateKey: IRecord<StateKey>) {
        if (currentStateRunner) {
            stopHandler(currentStateRunner);
        }
        currentStateKey = nextStateKey;
        currentState = initHandler(nextStateKey);
        currentStateRunner = startHandler(currentState, callback);
        return true;
    };
    var currentStateKey = null;
    var currentState = introInit(currentStateKey);
    var currentStateRunner = introStart(currentState, callback);
};