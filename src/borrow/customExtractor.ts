import { BlockModel } from "@oasisdex/spock-etl/dist/db/models/Block"
import { BlockExtractor } from "@oasisdex/spock-etl/dist/processors/types"
import { LocalServices } from "@oasisdex/spock-etl/dist/services/types"
import { extractRawLogsOnTopic, getPersistedLogsByTopic } from "@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor"
import { ethers } from "ethers"

export interface AbiInfo {
    name: string,
    functionNames: string[]
    abi: Object
    startingBlock?: number
}

export function getExtractorNameBasedOnDSNoteTopic(name: string) {
    return `raw_log_ds_note_topic_${name}_extractor`
}

export function makeRowEventBasedOnDSNoteTopic(abis: AbiInfo[]): BlockExtractor[] {
    return abis.map((abi) => {
        const iface = new ethers.utils.Interface(abi.abi as any)
        const eventsTopicOnFunctionSignature = abi.functionNames.map(name => {
            const functionDescription = iface.functions[name]
            if (!functionDescription) {
                throw new Error(`Function ${name} does not exists`)
            }
            return functionDescription.sighash.padEnd(66, '0');
        })

        return {
            name: getExtractorNameBasedOnDSNoteTopic(abi.name),
            startingBlock: abi.startingBlock,
            address: abi,
            extract: async (services, blocks) => {
                await extractRawLogsOnTopic(services, blocks, eventsTopicOnFunctionSignature)
            },
            async getData(services: LocalServices, blocks: BlockModel[]): Promise<any> {
                return await getPersistedLogsByTopic(services, eventsTopicOnFunctionSignature, blocks)
            },
        }
    })
}
