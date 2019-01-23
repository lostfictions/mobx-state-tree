import {
    IAnyType,
    ObjectNode,
    NodeLifeCycle,
    Hook,
    escapeJsonPath,
    EventHandlers
} from "../../internal"
import { createAtom, IAtom } from "mobx"

/**
 * @internal
 * @hidden
 */
export abstract class BaseNode {
    private _escapedSubpath?: string

    private _subpath!: string
    get subpath() {
        return this._subpath
    }

    private _subpathUponDeath?: string
    get subpathUponDeath() {
        return this._subpathUponDeath
    }

    private _pathUponDeath?: string
    protected get pathUponDeath() {
        return this._pathUponDeath
    }

    storedValue: any

    private aliveAtom?: IAtom
    private _state = NodeLifeCycle.INITIALIZING
    get state() {
        return this._state
    }
    set state(val: NodeLifeCycle) {
        const wasAlive = this.isAlive
        this._state = val
        const isAlive = this.isAlive

        if (this.aliveAtom && wasAlive !== isAlive) {
            this.aliveAtom.reportChanged()
        }
    }

    readonly type: IAnyType
    readonly hookSubscribers = new EventHandlers<{
        [Hook.afterAttach]: (node: any, hook: Hook) => void
        [Hook.afterCreate]: (node: any, hook: Hook) => void
        [Hook.afterCreationFinalization]: (node: any, hook: Hook) => void
        [Hook.beforeDestroy]: (node: any, hook: Hook) => void
        [Hook.beforeDetach]: (node: any, hook: Hook) => void
    }>()

    environment: any = undefined

    private _parent!: ObjectNode | null
    get parent() {
        return this._parent
    }

    constructor(type: IAnyType, parent: ObjectNode | null, subpath: string, environment: any) {
        this.environment = environment
        this.type = type
        this.baseSetParent(parent, subpath)
    }

    private pathAtom?: IAtom
    protected baseSetParent(parent: ObjectNode | null, subpath: string) {
        this._parent = parent
        this._subpath = subpath
        this._escapedSubpath = undefined // regenerate when needed
        if (this.pathAtom) {
            this.pathAtom.reportChanged()
        }
    }

    /*
     * Returns (escaped) path representation as string
     */
    get path(): string {
        return this.getEscapedPath(true)
    }

    protected getEscapedPath(reportObserved: boolean): string {
        if (reportObserved) {
            if (!this.pathAtom) {
                this.pathAtom = createAtom(`path`)
            }
            this.pathAtom.reportObserved()
        }
        if (!this.parent) return ""
        // regenerate escaped subpath if needed
        if (this._escapedSubpath === undefined) {
            this._escapedSubpath = !this._subpath ? "" : escapeJsonPath(this._subpath)
        }
        return this.parent.getEscapedPath(reportObserved) + "/" + this._escapedSubpath
    }

    get isRoot(): boolean {
        return this.parent === null
    }

    abstract get root(): ObjectNode

    abstract setParent(newParent: ObjectNode | null, subpath: string | null): void

    protected abstract fireHook(name: Hook): void

    protected fireInternalHook(name: Hook) {
        this.hookSubscribers.emit(name, this, name)
    }

    value: any

    snapshot: any
    abstract getSnapshot(): any

    get isAlive() {
        return this.state !== NodeLifeCycle.DEAD
    }

    get observableIsAlive() {
        if (!this.aliveAtom) {
            this.aliveAtom = createAtom(`alive`)
        }
        this.aliveAtom.reportObserved()
        return this.isAlive
    }

    abstract die(): void

    abstract finalizeCreation(): void

    protected baseFinalizeCreation(whenFinalized?: () => void) {
        // goal: afterCreate hooks runs depth-first. After attach runs parent first, so on afterAttach the parent has completed already
        if (this.state === NodeLifeCycle.CREATED) {
            if (this.parent) {
                if (this.parent.state !== NodeLifeCycle.FINALIZED) {
                    // parent not ready yet, postpone
                    return
                }
                this.fireHook(Hook.afterAttach)
            }

            this.state = NodeLifeCycle.FINALIZED

            if (whenFinalized) {
                whenFinalized()
            }
        }
    }

    abstract finalizeDeath(): void

    protected baseFinalizeDeath() {
        this.hookSubscribers.clearAll()

        this._subpathUponDeath = this._subpath
        this._pathUponDeath = this.getEscapedPath(false)
        this.baseSetParent(null, "")
        this.state = NodeLifeCycle.DEAD
    }

    abstract aboutToDie(): void

    protected baseAboutToDie() {
        this.fireHook(Hook.beforeDestroy)
    }
}

/**
 * @internal
 * @hidden
 */
export type INode = BaseNode
