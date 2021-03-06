import {
    fail,
    INode,
    createNode,
    Type,
    TypeFlags,
    isType,
    IContext,
    IValidationResult,
    typeCheckFailure,
    ObjectNode,
    ModelType,
    typeCheckSuccess,
    ISimpleType
} from "../../internal"

/**
 * @internal
 * @hidden
 */
export class IdentifierType extends Type<string, string, string> {
    readonly shouldAttachNode = false
    readonly flags = TypeFlags.Identifier

    constructor() {
        super(`identifier`)
    }

    instantiate(
        parent: ObjectNode | null,
        subpath: string,
        environment: any,
        snapshot: string
    ): INode {
        if (!parent || !(parent.type instanceof ModelType))
            throw fail(`Identifier types can only be instantiated as direct child of a model type`)

        return createNode(this, parent, subpath, environment, snapshot)
    }

    reconcile(current: INode, newValue: string) {
        if (current.storedValue !== newValue)
            throw fail(
                `Tried to change identifier from '${
                    current.storedValue
                }' to '${newValue}'. Changing identifiers is not allowed.`
            )
        return current
    }

    describe() {
        return `identifier`
    }

    isValidSnapshot(value: any, context: IContext): IValidationResult {
        if (typeof value !== "string") {
            return typeCheckFailure(
                context,
                value,
                "Value is not a valid identifier, expected a string"
            )
        }
        return typeCheckSuccess()
    }
}

/**
 * @internal
 * @hidden
 */
export class IdentifierNumberType extends IdentifierType {
    constructor() {
        super()
        ;(this as any).name = "identifierNumber"
    }

    instantiate(
        parent: ObjectNode | null,
        subpath: string,
        environment: any,
        snapshot: any
    ): INode {
        return super.instantiate(parent, subpath, environment, snapshot)
    }

    isValidSnapshot(value: any, context: IContext): IValidationResult {
        if (typeof value === "number") {
            return typeCheckSuccess()
        }
        return typeCheckFailure(
            context,
            value,
            "Value is not a valid identifierNumber, expected a number"
        )
    }

    reconcile(current: INode, newValue: any) {
        return super.reconcile(current, newValue)
    }

    getSnapshot(node: INode) {
        return node.storedValue
    }

    describe() {
        return `identifierNumber`
    }
}

/**
 * `types.identifier` - Identifiers are used to make references, lifecycle events and reconciling works.
 * Inside a state tree, for each type can exist only one instance for each given identifier.
 * For example there couldn't be 2 instances of user with id 1. If you need more, consider using references.
 * Identifier can be used only as type property of a model.
 * This type accepts as parameter the value type of the identifier field that can be either string or number.
 *
 * Example:
 * ```ts
 *  const Todo = types.model("Todo", {
 *      id: types.identifier,
 *      title: types.string
 *  })
 * ```
 *
 * @returns
 */
export const identifier: ISimpleType<string> = new IdentifierType()

/**
 * `types.identifierNumber` - Similar to `types.identifier`. This one will serialize from / to a number when applying snapshots
 *
 * Example:
 * ```ts
 *  const Todo = types.model("Todo", {
 *      id: types.identifierNumber,
 *      title: types.string
 *  })
 * ```
 *
 * @returns
 */
export const identifierNumber: ISimpleType<number> = new IdentifierNumberType() as any

/**
 * Returns if a given value represents an identifier type.
 *
 * @param type
 * @returns
 */
export function isIdentifierType<IT extends typeof identifier | typeof identifierNumber>(
    type: IT
): type is IT {
    return isType(type) && (type.flags & TypeFlags.Identifier) > 0
}

/**
 * Valid types for identifiers.
 */
export type ReferenceIdentifier = string | number

/**
 * @internal
 * @hidden
 */
export function normalizeIdentifier(id: ReferenceIdentifier): string {
    return "" + id
}
