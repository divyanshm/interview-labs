(function(){
'use strict';

function place(layout, nodes) {
  return nodes.map(function(node, index) {
    return node.concat(layout[index]);
  });
}

const LAYOUTS = {
  pipeline: [[8,18],[30,18],[10,74],[40,72],[56,40],[84,60],[84,14]],
  fanout: [[8,34],[28,18],[50,34],[80,32],[22,76],[82,72],[78,8]],
  graph: [[10,18],[30,18],[10,76],[52,38],[78,36],[54,80],[86,14]],
  control: [[10,10],[14,72],[38,14],[52,42],[78,46],[56,82],[88,12]],
  ring: [[8,22],[18,74],[42,48],[72,46],[46,10],[84,76],[88,18]],
  query: [[8,28],[28,12],[52,28],[80,24],[24,78],[78,72],[54,54]]
};

const contexts = {
  'distributed-data-processing::MapReduce': {
    scenario: 'Nightly ad billing groups impression logs by campaign before invoice close.',
    components: place(LAYOUTS.pipeline, [
      ['finopsScheduler','FinOps scheduler','job caller','client'],
      ['billingController','Billing batch controller','coordinating service','service'],
      ['impressionLake','Immutable impression lake','source of truth','storage'],
      ['executorPool','Spark executor pool','worker boundary','cluster'],
      ['campaignMapReduce','Campaign billing MapReduce','black-box mechanism','compute'],
      ['invoiceWarehouse','Invoice fact warehouse','committed output','storage'],
      ['batchOps','Batch ops console','operational control','control']
    ]),
    flows: [
      ['finopsScheduler','billingController','start invoice-close rollup','The nightly close window opens a billing run for the completed day.'],
      ['billingController','impressionLake','pin immutable input manifest','The controller selects the exact log snapshot that finance approved for billing.'],
      ['billingController','executorPool','assign partition bundles','The coordinator distributes partition ranges and retry budgets to the worker pool.'],
      ['executorPool','campaignMapReduce','stream partition records into billing stage','Workers feed the black-box MapReduce stage with campaign-keyed impression data.'],
      ['campaignMapReduce','invoiceWarehouse','publish per-campaign billable totals','The stage emits the rolled-up counts that downstream invoicing will consume.'],
      ['campaignMapReduce','batchOps','raise skew or reduce failure signal','A single slow campaign or bad output partition is surfaced to operations immediately.'],
      ['batchOps','billingController','restart only failed partition set','Operations instruct the controller to replay the broken slice without rerunning the full batch.']
    ]
  },
  'distributed-data-processing::Shuffle': {
    scenario: 'Fraud analytics repartitions checkout events by shopper before session scoring.',
    components: place(LAYOUTS.control, [
      ['riskScheduler','Risk analytics scheduler','job caller','client'],
      ['checkoutLake','Checkout event lake','source of truth','storage'],
      ['shuffleSupervisor','Repartition supervisor','coordinating service','service'],
      ['shopperShuffle','Shopper-key shuffle fabric','black-box mechanism','compute'],
      ['mapWriters','Map writer fleet','worker boundary','cluster'],
      ['featureTable','Fraud session feature table','downstream result store','storage'],
      ['netOps','Network and skew controller','operational control','control']
    ]),
    flows: [
      ['riskScheduler','shuffleSupervisor','launch midnight fraud feature job','The risk pipeline begins the daily shopper-behavior feature build.'],
      ['shuffleSupervisor','checkoutLake','freeze checkout snapshot','The supervisor locks the exact raw event manifest that all downstream tasks must use.'],
      ['shuffleSupervisor','mapWriters','issue transfer plan and destination ranges','Workers receive the partition map for shopper-id ownership.'],
      ['mapWriters','shopperShuffle','emit shopper-keyed batches','Each worker hands keyed event batches to the shuffle service for regrouping.'],
      ['shopperShuffle','featureTable','deliver regrouped shopper streams','The fabric outputs session-complete shopper event bundles into the feature table load.'],
      ['shopperShuffle','netOps','report hotspot partition or transfer spill','The service surfaces overloaded destinations before latency cascades across the batch.'],
      ['netOps','shuffleSupervisor','split hot shopper range and retry fanout','Operations rebalance the hottest key range and replay only the impacted transfers.']
    ]
  },
  'distributed-data-processing::Combiners': {
    scenario: 'CDN traffic accounting pre-sums status codes near the edge before regional rollup.',
    components: place(LAYOUTS.fanout, [
      ['trafficRunner','Traffic finance runner','job caller','client'],
      ['meteringCoordinator','Metering coordinator','coordinating service','service'],
      ['edgeLogLake','Raw edge log lake','source of truth','storage'],
      ['edgeMappers','Edge log mappers','worker boundary','cluster'],
      ['statusCombiner','Status-code combiner','black-box mechanism','compute'],
      ['usageWarehouse','Regional usage warehouse','partial result store','storage'],
      ['memoryGuard','Combiner guardrail console','operational control','control']
    ]),
    flows: [
      ['trafficRunner','meteringCoordinator','start hourly traffic accounting','Finance kicks off the next hourly usage cycle after log ingestion completes.'],
      ['meteringCoordinator','edgeLogLake','select POP log segments','The coordinator chooses the immutable edge log slices for this accounting window.'],
      ['meteringCoordinator','edgeMappers','assign POP splits and memory budgets','Each mapper receives its local shard together with a safe aggregation budget.'],
      ['edgeMappers','statusCombiner','collapse repeated status keys locally','Workers pass repeated local counters into the combiner before any remote transfer.'],
      ['statusCombiner','usageWarehouse','forward reduced partial tallies','Only compacted partial counts flow onward into the regional warehouse pipeline.'],
      ['statusCombiner','memoryGuard','signal tenant cardinality blowup','A sudden explosion in unique keys is surfaced as an operational hazard.'],
      ['memoryGuard','meteringCoordinator','disable combiner for suspect tenant','Operations can rerun the problematic tenant path without local combining.']
    ]
  },
  'distributed-data-processing::Distributed aggregation': {
    scenario: 'Marketplace finance computes daily gross merchandise value by merchant across regions.',
    components: place(LAYOUTS.graph, [
      ['closeWorkflow','Finance close workflow','job caller','client'],
      ['gmvService','GMV aggregation service','coordinating service','service'],
      ['orderLedger','Order ledger lakehouse','source of truth','storage'],
      ['merchantAggregator','Merchant GMV aggregator','black-box mechanism','compute'],
      ['regionalScanners','Regional scan pool','worker boundary','cluster'],
      ['financeMart','Merchant finance mart','final result store','storage'],
      ['reconcileDesk','Reconciliation desk','operational control','control']
    ]),
    flows: [
      ['closeWorkflow','gmvService','open daily merchant close','Finance requests the end-of-day merchant revenue rollup.'],
      ['gmvService','orderLedger','read committed ledger snapshot','The service locks the exact order and refund view used for the close.'],
      ['gmvService','regionalScanners','dispatch region-aligned scan tasks','Regional workers receive the slices they own for local summarization.'],
      ['regionalScanners','merchantAggregator','submit merchant partial totals','Workers stream partial merchant revenue summaries into the aggregation engine.'],
      ['merchantAggregator','financeMart','write final merchant GMV rows','The global daily totals are committed for downstream invoicing and audit.'],
      ['merchantAggregator','reconcileDesk','emit mismatch against control totals','Any drift from expected ledger totals becomes an operations incident.'],
      ['reconcileDesk','gmvService','replay affected region with tighter filters','The controller reruns only the region that failed reconciliation.']
    ]
  },
  'distributed-data-processing::Broadcast joins': {
    scenario: 'Checkout tax enrichment joins every order with a small country tax rule table.',
    components: place(LAYOUTS.query, [
      ['pricingManager','Pricing release manager','job caller','client'],
      ['taxBatchCoordinator','Tax batch coordinator','coordinating service','service'],
      ['ordersAndRules','Orders snapshot and tax rules registry','source of truth','storage'],
      ['taxBroadcastJoin','Tax-rule broadcast join','black-box mechanism','compute'],
      ['orderProcessors','Order processor pool','worker boundary','cluster'],
      ['taxedOrders','Tax-enriched orders table','final result store','storage'],
      ['rolloutControl','Join rollout controller','operational control','control']
    ]),
    flows: [
      ['pricingManager','taxBatchCoordinator','publish tax enrichment run','Pricing opens the nightly order enrichment window.'],
      ['taxBatchCoordinator','ordersAndRules','pin order snapshot and rule version','The coordinator binds orders to one approved rule package for consistent tax output.'],
      ['taxBatchCoordinator','orderProcessors','ship join plan and rule artifact','Workers receive the local order ranges and the small reference dataset to use.'],
      ['orderProcessors','taxBroadcastJoin','apply local enrichment with broadcast rules','Each processor hands its orders to the black-box join stage for enrichment.'],
      ['taxBroadcastJoin','taxedOrders','commit tax-enriched order rows','The completed join writes rows that downstream billing and support can inspect.'],
      ['taxBroadcastJoin','rolloutControl','report oversized rule package','A rule bundle that no longer fits the expected size budget is surfaced immediately.'],
      ['rolloutControl','taxBatchCoordinator','fallback to partitioned path','Operations can switch the run to a slower but safer non-broadcast execution path.']
    ]
  },
  'distributed-data-processing::Hash joins': {
    scenario: 'Ad attribution joins large click and conversion datasets by session id.',
    components: place(LAYOUTS.ring, [
      ['attributionScheduler','Attribution scheduler','job caller','client'],
      ['joinPlanner','Join planner','coordinating service','service'],
      ['sessionLake','Click and conversion lakehouse','source of truth','storage'],
      ['partitionWorkers','Partition worker fleet','worker boundary','cluster'],
      ['sessionHashJoin','Session hash join','black-box mechanism','compute'],
      ['attributionFacts','Attribution fact table','final result store','storage'],
      ['spillMonitor','Spill monitor','operational control','control']
    ]),
    flows: [
      ['attributionScheduler','joinPlanner','start attribution rebuild','The daily attribution rebuild is requested after both click and conversion feeds close.'],
      ['joinPlanner','sessionLake','open matching dataset snapshots','The planner selects the exact dataset versions to correlate by session id.'],
      ['joinPlanner','partitionWorkers','allocate hash partitions and retry policy','Workers receive partition assignments that keep matching sessions together.'],
      ['partitionWorkers','sessionHashJoin','process aligned partition pairs','Partition owners hand paired slices into the hash-join engine.'],
      ['sessionHashJoin','attributionFacts','publish matched attribution rows','The engine writes the click-to-conversion links needed for reporting.'],
      ['sessionHashJoin','spillMonitor','signal spill-heavy advertiser bucket','A single oversized partition is raised before it exhausts cluster storage.'],
      ['spillMonitor','joinPlanner','rebalance hot bucket and replay impacted work','Operations reshard the hottest advertiser cohort and retry only its partitions.']
    ]
  },
  'distributed-data-processing::Sort-merge joins': {
    scenario: 'Treasury reconciliation matches payout ledger entries with bank settlement files by transfer id.',
    components: place(LAYOUTS.control, [
      ['treasuryScheduler','Treasury close scheduler','job caller','client'],
      ['reconOrchestrator','Reconciliation orchestrator','coordinating service','service'],
      ['ledgerArchive','Payout ledger and bank archive','source of truth','storage'],
      ['transferSortMerge','Transfer sort-merge join','black-box mechanism','compute'],
      ['rangeReaders','Sorted partition readers','worker boundary','cluster'],
      ['reconJournal','Reconciliation journal','final result store','storage'],
      ['exceptionDesk','Exception desk','operational control','control']
    ]),
    flows: [
      ['treasuryScheduler','reconOrchestrator','start settlement reconciliation','Treasury begins the daily comparison between internal payouts and bank settlements.'],
      ['reconOrchestrator','ledgerArchive','pin sorted ledger and settlement snapshots','Both ordered input sets are frozen to one version before matching begins.'],
      ['reconOrchestrator','rangeReaders','assign transfer-id ranges','Workers receive contiguous transfer-id windows to scan in order.'],
      ['rangeReaders','transferSortMerge','stream ordered ranges into reconciliation stage','The readers hand ordered records into the join stage without random access.'],
      ['transferSortMerge','reconJournal','write matched and unmatched journal entries','Treasury receives one audited output surface for both successes and gaps.'],
      ['transferSortMerge','exceptionDesk','report missing bank chunk or corrupt range','Any broken input segment immediately surfaces as an operational exception.'],
      ['exceptionDesk','reconOrchestrator','pause cutover and rerun failed range','Operations keep the book close frozen until the bad range is replayed cleanly.']
    ]
  },
  'distributed-data-processing::Checkpointing': {
    scenario: 'A multi-hour feature engineering batch resumes from stable stage checkpoints after spot node loss.',
    components: place(LAYOUTS.graph, [
      ['featureScheduler','ML feature scheduler','job caller','client'],
      ['featureController','Feature batch controller','coordinating service','service'],
      ['rawFeatureLake','Raw feature lake','source of truth','storage'],
      ['checkpointManager','Stage checkpoint manager','black-box mechanism','compute'],
      ['transformExecutors','Transform executor pool','worker boundary','cluster'],
      ['featureParquet','Feature parquet output set','final result store','storage'],
      ['recoveryConsole','Recovery console','operational control','control']
    ]),
    flows: [
      ['featureScheduler','featureController','start model refresh batch','The scheduler opens the long-running batch that builds the next feature snapshot.'],
      ['featureController','rawFeatureLake','lock source snapshot version','All downstream work is tied to one consistent raw data generation.'],
      ['featureController','transformExecutors','assign transform graph and checkpoint cadence','Workers receive both work and the cadence for durable stage recovery.'],
      ['transformExecutors','checkpointManager','persist stage-complete recovery points','Executors notify the checkpoint manager after each recoverable stage boundary.'],
      ['checkpointManager','featureParquet','finalize output from last stable point','Only stable stage outputs are committed as the official feature snapshot.'],
      ['checkpointManager','recoveryConsole','announce lost executor and safe resume point','Operations get the highest usable checkpoint as soon as capacity disappears.'],
      ['recoveryConsole','featureController','resume unfinished windows from checkpoint','The controller restarts from the last durable point instead of replaying the full job.']
    ]
  },
  'search-retrieval::TF-IDF': {
    scenario: 'An internal support portal ranks troubleshooting articles for a token cache corruption query.',
    components: place(LAYOUTS.fanout, [
      ['supportBrowser','Support agent browser','query caller','client'],
      ['articleGateway','Article search gateway','coordinating service','service'],
      ['articleCms','Support article CMS','source of truth','storage'],
      ['lexicalShards','Lexical postings shards','index boundary','index'],
      ['tfidfScorer','Support TF-IDF scorer','black-box mechanism','compute'],
      ['resultApi','Result API cache','query result surface','service'],
      ['freshnessControl','Index freshness controller','operational control','control']
    ]),
    flows: [
      ['supportBrowser','articleGateway','submit token cache corruption query','A support engineer asks for troubleshooting material during an active customer case.'],
      ['articleGateway','tfidfScorer','build weighted lexical search request','The gateway passes normalized terms and tenant scope into the scoring service.'],
      ['tfidfScorer','lexicalShards','fetch postings and corpus statistics','The scorer asks the index boundary for the article candidates tied to the query terms.'],
      ['lexicalShards','tfidfScorer','return candidate article features','Shard responses provide the term evidence required for ranking.'],
      ['tfidfScorer','resultApi','publish ranked article ids and snippets','The best support articles are staged for immediate reuse by the portal.'],
      ['articleCms','freshnessControl','stream newly approved troubleshooting article','A content update enters the search freshness path from the source system.'],
      ['freshnessControl','lexicalShards','refresh postings for latest article generation','The controller updates the searchable corpus without waiting for a full rebuild.']
    ]
  },
  'search-retrieval::BM25': {
    scenario: 'Developer documentation search ranks engineering guides for a query about managed identity retries.',
    components: place(LAYOUTS.query, [
      ['docsSearchUi','Developer docs UI','query caller','client'],
      ['docsBroker','Docs query broker','coordinating service','service'],
      ['docsRepo','Documentation repository','source of truth','storage'],
      ['bm25Scorer','Docs BM25 scorer','black-box mechanism','compute'],
      ['segmentShards','Segment shards','index boundary','index'],
      ['snippetCache','Snippet cache','query result surface','service'],
      ['indexController','Lexical index controller','operational control','control']
    ]),
    flows: [
      ['docsSearchUi','docsBroker','search managed identity retries','An engineer looks for the most relevant retry guidance before changing code.'],
      ['docsBroker','bm25Scorer','issue lexical ranking request','The broker passes the normalized terms, filters, and locale into the scorer.'],
      ['bm25Scorer','segmentShards','read ranked candidate evidence','The scorer asks shard segments for candidate postings and scoring statistics.'],
      ['segmentShards','bm25Scorer','return scored lexical features','Each shard returns the evidence needed for the BM25 ranking pass.'],
      ['bm25Scorer','snippetCache','store ranked pages and teaser snippets','The search surface receives a ready-to-render response for the caller.'],
      ['docsRepo','indexController','emit document publish delta','A changed page enters the search control path from the source repository.'],
      ['indexController','segmentShards','refresh affected segments','Operations roll updated lexical segments into service without a full index swap.']
    ]
  },
  'search-retrieval::Top-K retrieval': {
    scenario: 'Marketplace search keeps only the top 20 offers from many shard candidate streams.',
    components: place(LAYOUTS.ring, [
      ['shopperApp','Shopper app','query caller','client'],
      ['searchAggregator','Offer search aggregator','coordinating service','service'],
      ['offerCatalog','Offer catalog and inventory ledger','source of truth','storage'],
      ['candidateShards','Offer candidate shards','index boundary','index'],
      ['topKSelector','Offer top-K selector','black-box mechanism','compute'],
      ['resultsPageCache','Results page cache','query result surface','service'],
      ['tailController','Tail-latency controller','operational control','control']
    ]),
    flows: [
      ['shopperApp','searchAggregator','submit category search with filters','A shopper requests the best laptop offers for a narrow filter set.'],
      ['searchAggregator','candidateShards','fan out candidate request to offer shards','The coordinator asks every relevant shard for scored offer candidates.'],
      ['candidateShards','topKSelector','stream shard-level candidates','Scored offer candidates are handed to the top-K service for final selection.'],
      ['topKSelector','resultsPageCache','materialize top 20 offers','The selected offers are stored in the response surface used by the search page.'],
      ['resultsPageCache','shopperApp','serve final offer page','The caller receives the compact result page without waiting on every slower shard.'],
      ['offerCatalog','tailController','publish inventory invalidation and pricing drift','A catalog change or late price feed triggers operational scrutiny.'],
      ['tailController','searchAggregator','trim slow shard and retry on replica','Operations can preserve latency by dropping a bad shard and rerouting the request.']
    ]
  },
  'search-retrieval::Approximate nearest neighbor (ANN)': {
    scenario: 'A photo moderation tool finds visually similar previously banned images within a strict latency budget.',
    components: place(LAYOUTS.control, [
      ['moderatorConsole','Moderator console','query caller','client'],
      ['imageRegistry','Image metadata and embedding registry','source of truth','storage'],
      ['vectorApi','Vector search API','coordinating service','service'],
      ['annFinder','Image ANN neighbor finder','black-box mechanism','compute'],
      ['vectorShards','Vector shard fleet','index boundary','index'],
      ['reviewQueue','Match review queue','query result surface','service'],
      ['recallGuard','Recall guardrail controller','operational control','control']
    ]),
    flows: [
      ['moderatorConsole','vectorApi','search similar banned images','A moderator submits a suspicious image for fast similarity lookup.'],
      ['vectorApi','imageRegistry','fetch current embedding and policy scope','The API resolves the image embedding and moderation scope from the source system.'],
      ['vectorApi','annFinder','issue bounded nearest-neighbor request','The query is handed to the ANN service with the active recall budget.'],
      ['annFinder','vectorShards','probe vector shards for close candidates','The mechanism consults the vector index boundary for likely matches.'],
      ['vectorShards','reviewQueue','stage candidate matches for moderator review','Returned neighbors are queued for the human moderation workflow.'],
      ['annFinder','recallGuard','report recall drift or latency breach','Operational telemetry surfaces when the approximate path underperforms.'],
      ['recallGuard','vectorApi','raise probe count or route to exact fallback','The controller can trade more work for higher confidence on sensitive cases.']
    ]
  },
  'search-retrieval::HNSW': {
    scenario: 'A support chatbot retrieves semantically similar solved tickets for live agent assist.',
    components: place(LAYOUTS.graph, [
      ['chatAgent','Agent assist console','query caller','client'],
      ['semanticGateway','Semantic retrieval gateway','coordinating service','service'],
      ['ticketArchive','Solved ticket archive','source of truth','storage'],
      ['hnswNavigator','Ticket HNSW navigator','black-box mechanism','compute'],
      ['graphShards','HNSW graph shards','index boundary','index'],
      ['contextCache','Answer context cache','query result surface','service'],
      ['graphHealth','Graph health controller','operational control','control']
    ]),
    flows: [
      ['chatAgent','semanticGateway','request similar solved tickets','A live support agent asks for prior incidents matching the current conversation.'],
      ['semanticGateway','ticketArchive','resolve ticket scope and embedding version','The gateway uses the source system to anchor the query to the right corpus and version.'],
      ['semanticGateway','hnswNavigator','start semantic neighbor lookup','The query is handed to the HNSW service for low-latency approximate search.'],
      ['hnswNavigator','graphShards','search active graph partitions','The mechanism asks the HNSW index boundary for nearest candidate tickets.'],
      ['graphShards','contextCache','stage similar-ticket contexts','Ranked ticket references are cached for immediate grounding in the chat response.'],
      ['ticketArchive','graphHealth','stream newly resolved ticket updates','Fresh solved tickets enter the operational update path from the archive.'],
      ['graphHealth','graphShards','rebuild affected graph neighborhoods','Operations repair the graph structure as new tickets or deletions arrive.']
    ]
  },
  'search-retrieval::IVF': {
    scenario: 'A recommendation API searches product embeddings by category while holding p99 latency under budget.',
    components: place(LAYOUTS.pipeline, [
      ['recommendationApi','Recommendation API','query caller','client'],
      ['candidatePlanner','Candidate planner','coordinating service','service'],
      ['productCatalog','Product catalog and embeddings registry','source of truth','storage'],
      ['cellWorkers','IVF shard workers','index boundary','index'],
      ['ivfProbe','IVF cell probe engine','black-box mechanism','compute'],
      ['candidateCache','Recommendation candidate cache','query result surface','service'],
      ['latencyBudget','Latency budget controller','operational control','control']
    ]),
    flows: [
      ['recommendationApi','candidatePlanner','request similar items for product','The serving API asks for related items around one anchor product.'],
      ['candidatePlanner','productCatalog','fetch anchor embedding and category filter','The planner resolves the exact vector and serving filter from the catalog.'],
      ['candidatePlanner','ivfProbe','issue bounded cell-probe request','The planner sends the query into the IVF mechanism with the active probe budget.'],
      ['ivfProbe','cellWorkers','search selected coarse cells','The mechanism consults only the chosen index cells across the vector fleet.'],
      ['cellWorkers','candidateCache','return candidate product ids','Candidate ids are staged for reranking and page assembly.'],
      ['ivfProbe','latencyBudget','emit recall-versus-latency telemetry','The service reports when the current probe count misses the target tradeoff.'],
      ['latencyBudget','candidatePlanner','increase probe count or use category fallback','Operations can trade more search work for quality when needed.']
    ]
  },
  'search-retrieval::Vector indexes': {
    scenario: 'An employee copilot retrieves policy passages from millions of document embeddings for grounded answers.',
    components: place(LAYOUTS.fanout, [
      ['copilotCaller','Employee copilot','query caller','client'],
      ['retrievalOrchestrator','Retrieval orchestrator','coordinating service','service'],
      ['policyRegistry','Policy document registry','source of truth','storage'],
      ['vectorFleet','Vector index fleet','index boundary','index'],
      ['policyVectorIndex','Policy vector index','black-box mechanism','compute'],
      ['groundingCache','Grounding snippet cache','query result surface','service'],
      ['lifecycleControl','Index lifecycle controller','operational control','control']
    ]),
    flows: [
      ['copilotCaller','retrievalOrchestrator','ask parental leave policy question','The assistant needs relevant passages before generating a grounded response.'],
      ['retrievalOrchestrator','policyRegistry','resolve active policy corpus version','The orchestrator chooses the approved policy corpus for the employee tenant.'],
      ['retrievalOrchestrator','policyVectorIndex','issue vector lookup for grounding','The query embedding and filters are handed to the vector index service.'],
      ['policyVectorIndex','vectorFleet','search active vector segments','The mechanism asks the index boundary for the most relevant passage candidates.'],
      ['vectorFleet','groundingCache','stage candidate passages for answer builder','Candidate snippets are stored where the response pipeline can consume them quickly.'],
      ['policyRegistry','lifecycleControl','publish policy change feed','New or corrected policy documents enter the operational indexing path.'],
      ['lifecycleControl','vectorFleet','swap rebuilt segment generation','Operations roll a fresh vector build into service while draining stale segments.']
    ]
  },
  'distributed-algorithms::BFS / DFS': {
    scenario: 'An incident commander explores service dependency blast radius from a failing identity issuer.',
    components: place(LAYOUTS.graph, [
      ['incidentCommander','Incident commander console','job caller','client'],
      ['dependencyApi','Dependency query API','coordinating service','service'],
      ['topologyStore','Service topology graph store','source of truth','storage'],
      ['traversalEngine','Blast-radius traversal engine','black-box mechanism','compute'],
      ['traversalWorkers','Traversal worker pool','worker boundary','cluster'],
      ['incidentWorkspace','Incident workspace','result surface','service'],
      ['investigationControl','Investigation controller','operational control','control']
    ]),
    flows: [
      ['incidentCommander','dependencyApi','request issuer blast radius','The incident lead asks which downstream systems might fail with the issuer.'],
      ['dependencyApi','topologyStore','pin latest dependency graph snapshot','The API locks the service graph version used for the investigation.'],
      ['dependencyApi','traversalWorkers','dispatch seed service and traversal mode','Workers receive the start node together with depth and mode constraints.'],
      ['traversalWorkers','traversalEngine','execute reachability walk','The worker pool hands the graph slice into the traversal engine.'],
      ['traversalEngine','incidentWorkspace','publish impacted service set','The discovered blast radius is posted where responders can coordinate mitigation.'],
      ['traversalEngine','investigationControl','report traversal budget exhaustion','A huge or cyclic dependency area is surfaced as an operational limit.'],
      ['investigationControl','dependencyApi','expand depth cap or switch traversal mode','Operations refine the query without rebuilding the whole incident workflow.']
    ]
  },
  'distributed-algorithms::Dijkstra': {
    scenario: 'A route planner selects the lowest-latency gateway path for a cross-region payment call.',
    components: place(LAYOUTS.pipeline, [
      ['routingClient','Routing client','job caller','client'],
      ['routePlanner','Route planning service','coordinating service','service'],
      ['networkCosts','Network cost registry','source of truth','storage'],
      ['routeWorkers','Route compute workers','worker boundary','cluster'],
      ['dijkstraEngine','Shortest-route Dijkstra engine','black-box mechanism','compute'],
      ['routeCache','Approved route cache','result surface','service'],
      ['trafficControl','Traffic control console','operational control','control']
    ]),
    flows: [
      ['routingClient','routePlanner','request best gateway chain','The caller needs the best live route before sending a payment request.'],
      ['routePlanner','networkCosts','read current link-cost snapshot','The planner pulls the latest latency and health picture from the network registry.'],
      ['routePlanner','routeWorkers','assign region graph and SLA target','Workers receive the graph slice and the latency objective for this request.'],
      ['routeWorkers','dijkstraEngine','compute least-cost route','The route graph is handed to the Dijkstra service as one black-box path search.'],
      ['dijkstraEngine','routeCache','publish chosen gateway sequence','The selected path is cached for fast reuse by nearby requests.'],
      ['dijkstraEngine','trafficControl','flag stale or missing edge costs','Any suspect cost feed is surfaced before a bad path reaches production traffic.'],
      ['trafficControl','routePlanner','fence outdated plan and recompute','Operations can invalidate a route and rerun planning against a fresh snapshot.']
    ]
  },
  'distributed-algorithms::Bellman-Ford': {
    scenario: 'A transfer pricing service plans the cheapest route when promotional credits introduce negative link costs.',
    components: place(LAYOUTS.control, [
      ['pricingClient','Pricing client','job caller','client'],
      ['transferApi','Transfer planning API','coordinating service','service'],
      ['contractLedger','Contract and cost ledger','source of truth','storage'],
      ['bellmanFordEngine','Credit-aware Bellman-Ford engine','black-box mechanism','compute'],
      ['routeFleet','Route compute fleet','worker boundary','cluster'],
      ['quoteStore','Quoted path store','result surface','service'],
      ['riskDesk','Risk control desk','operational control','control']
    ]),
    flows: [
      ['pricingClient','transferApi','request lowest-cost transfer path','The caller needs a corridor quote that includes temporary promotional credits.'],
      ['transferApi','contractLedger','load current fees and credits','The API resolves the latest carrier prices and promotion adjustments.'],
      ['transferApi','routeFleet','fan out corridor graph evaluation','Workers receive the corridor topology and contract scope for this quote.'],
      ['routeFleet','bellmanFordEngine','evaluate credit-adjusted route graph','The route graph is processed by the Bellman-Ford mechanism as one pricing step.'],
      ['bellmanFordEngine','quoteStore','persist quoted path and audit basis','The resulting path and the approved quote context are stored together.'],
      ['bellmanFordEngine','riskDesk','signal negative-cycle style contract anomaly','A bad pricing loop or broken contract update becomes a risk event.'],
      ['riskDesk','transferApi','quarantine corridor and serve manual fallback','Operations can block the risky corridor until the contract data is corrected.']
    ]
  },
  'distributed-algorithms::Minimum spanning tree': {
    scenario: 'Network expansion teams design the cheapest fiber plan connecting new edge sites.',
    components: place(LAYOUTS.ring, [
      ['capacityPlanner','Capacity planner','job caller','client'],
      ['designService','Expansion design service','coordinating service','service'],
      ['siteInventory','Site and trench cost inventory','source of truth','storage'],
      ['evaluationCluster','Topology evaluation cluster','worker boundary','cluster'],
      ['mstPlanner','Fiber MST planner','black-box mechanism','compute'],
      ['capexStore','Capex proposal store','result surface','service'],
      ['fieldControl','Field engineering control','operational control','control']
    ]),
    flows: [
      ['capacityPlanner','designService','request regional build plan','Capacity planning asks for a cost-minimal way to connect newly approved sites.'],
      ['designService','siteInventory','load candidate site and trench costs','The service binds the design run to one approved infrastructure snapshot.'],
      ['designService','evaluationCluster','distribute regional topology package','Workers receive the candidate links and regional constraints for evaluation.'],
      ['evaluationCluster','mstPlanner','generate minimum-connectivity design','The topology package is handed to the MST planner as a black-box cost optimizer.'],
      ['mstPlanner','capexStore','write selected fiber links','The chosen backbone links are stored for finance and deployment review.'],
      ['mstPlanner','fieldControl','report disconnected mandatory site','A missing or isolated site is surfaced as a planning exception.'],
      ['fieldControl','designService','inject required fallback link and rerun','Operations can override a missing segment and request a corrected design.']
    ]
  },
  'distributed-algorithms::Kruskal': {
    scenario: 'Peering procurement chooses the cheapest cross-provider circuits for a new continent launch.',
    components: place(LAYOUTS.graph, [
      ['sourcingAnalyst','Sourcing analyst','job caller','client'],
      ['procurementPlanner','Procurement planner','coordinating service','service'],
      ['carrierBids','Carrier bid repository','source of truth','storage'],
      ['kruskalSelector','Kruskal circuit selector','black-box mechanism','compute'],
      ['circuitPool','Circuit evaluation pool','worker boundary','cluster'],
      ['awardLedger','Awarded-circuit ledger','result surface','service'],
      ['procurementDesk','Procurement exception desk','operational control','control']
    ]),
    flows: [
      ['sourcingAnalyst','procurementPlanner','start peering award simulation','The sourcing team asks for the cheapest valid circuit package across providers.'],
      ['procurementPlanner','carrierBids','snapshot bids and facility availability','The planner uses one fixed set of provider bids and site availability data.'],
      ['procurementPlanner','circuitPool','assign circuit catalog slices','Workers receive the candidate circuits relevant to their geography.'],
      ['circuitPool','kruskalSelector','submit circuit graph for selection','The evaluated circuit graph is handed to the Kruskal selector as one black-box choice.'],
      ['kruskalSelector','awardLedger','publish provisional circuit awards','The winning circuit set is stored for negotiation and legal review.'],
      ['kruskalSelector','procurementDesk','flag disconnected facility component','A region that cannot be connected within the current bids becomes an exception.'],
      ['procurementDesk','procurementPlanner','exclude withdrawn bid and rerun award set','Operations update the candidate set and ask for a clean replacement plan.']
    ]
  },
  'distributed-algorithms::Prim': {
    scenario: 'A campus cabling tool grows a switch backbone outward from the main core.',
    components: place(LAYOUTS.query, [
      ['networkEngineer','Network engineer','job caller','client'],
      ['cablingPlanner','Cabling planner service','coordinating service','service'],
      ['floorMapDb','Floor map and conduit cost DB','source of truth','storage'],
      ['primPlanner','Prim backbone planner','black-box mechanism','compute'],
      ['siteWorkers','Site evaluation workers','worker boundary','cluster'],
      ['bomStore','Approved cable BOM store','result surface','service'],
      ['changeBoard','Change-control board','operational control','control']
    ]),
    flows: [
      ['networkEngineer','cablingPlanner','design building backbone','The engineer asks for a low-cost backbone rooted at the approved core switch.'],
      ['cablingPlanner','floorMapDb','read closet map and conduit costs','The planner binds the run to the latest approved campus layout and costs.'],
      ['cablingPlanner','siteWorkers','prepare adjacency package by closet','Workers assemble the adjacency view needed for the design run.'],
      ['siteWorkers','primPlanner','expand backbone from core','The topology package is handed to the Prim planner as one black-box backbone expansion.'],
      ['primPlanner','bomStore','store bill of materials and path references','The resulting backbone design is published for purchasing and installation.'],
      ['primPlanner','changeBoard','report closet that exceeds capex cap','An expensive branch is surfaced to the change board for approval or redesign.'],
      ['changeBoard','cablingPlanner','request alternate seed or phased build','Operations can change the rollout strategy without editing raw topology data.']
    ]
  },
  'distributed-algorithms::Topological sort': {
    scenario: 'Release automation orders microservice deployments with explicit dependencies.',
    components: place(LAYOUTS.control, [
      ['releaseManager','Release manager','job caller','client'],
      ['deployOrchestrator','Deployment orchestrator','coordinating service','service'],
      ['dependencyRegistry','Service dependency registry','source of truth','storage'],
      ['topoPlanner','Topological rollout planner','black-box mechanism','compute'],
      ['rolloutFleet','Rollout worker fleet','worker boundary','cluster'],
      ['timelineStore','Release timeline store','result surface','service'],
      ['rollbackControl','Rollback controller','operational control','control']
    ]),
    flows: [
      ['releaseManager','deployOrchestrator','schedule Friday rollout','The release lead starts a deployment for a coordinated microservice version set.'],
      ['deployOrchestrator','dependencyRegistry','load approved dependency DAG','The orchestrator pins the dependency graph that governs rollout order.'],
      ['deployOrchestrator','rolloutFleet','assign deployable service bundle','Workers receive candidate services and environment targets for the rollout.'],
      ['rolloutFleet','topoPlanner','produce safe rollout order','The service bundle is handed to the topological planner for sequencing.'],
      ['topoPlanner','timelineStore','publish deployment timeline','The final order is committed where automation and humans can both inspect it.'],
      ['topoPlanner','rollbackControl','signal dependency cycle or missing owner','Any impossible ordering is raised before the first service deploys.'],
      ['rollbackControl','deployOrchestrator','halt rollout and create remediation task','Operations stop the change and open follow-up work for the broken dependency.']
    ]
  },
  'distributed-algorithms::Union-Find': {
    scenario: 'A fraud platform incrementally groups linked accounts during an active investigation.',
    components: place(LAYOUTS.pipeline, [
      ['fraudAnalyst','Fraud analyst','job caller','client'],
      ['caseApi','Case graph API','coordinating service','service'],
      ['linkLedger','Account-link evidence ledger','source of truth','storage'],
      ['matcherFleet','Streaming matcher fleet','worker boundary','cluster'],
      ['clusteringEngine','Union-Find clustering engine','black-box mechanism','compute'],
      ['clusterStore','Fraud cluster store','result surface','service'],
      ['investigationDesk','Investigation desk','operational control','control']
    ]),
    flows: [
      ['fraudAnalyst','caseApi','open linked-account cluster build','The analyst asks for the latest connected-account view for one fraud ring.'],
      ['caseApi','linkLedger','read account-link evidence snapshot','The API pins the evidence set that defines account connectivity for the case.'],
      ['caseApi','matcherFleet','stream evidence edges into clustering job','Workers receive the account-link edges relevant to this investigation.'],
      ['matcherFleet','clusteringEngine','merge linked accounts into components','The worker fleet hands the evidence stream to the clustering engine.'],
      ['clusteringEngine','clusterStore','write stable cluster ids','The resulting connected components are published back to the investigation surface.'],
      ['clusteringEngine','investigationDesk','report suspicious cluster explosion','A sudden component blowup is surfaced as a possible bad evidence source.'],
      ['investigationDesk','caseApi','freeze noisy source and rebuild affected case','Operations can remove bad evidence and ask for a clean rebuild.']
    ]
  },
  'distributed-algorithms::Consistent hashing': {
    scenario: 'A CDN edge layer places cache keys on a changing fleet of regional caches.',
    components: place(LAYOUTS.ring, [
      ['edgeCaller','Edge request path','job caller','client'],
      ['cacheRouter','Cache routing service','coordinating service','service'],
      ['membershipRegistry','Cache membership and asset registry','source of truth','storage'],
      ['cacheRing','Regional cache ring members','worker boundary','cluster'],
      ['placementEngine','Consistent-hash placement engine','black-box mechanism','compute'],
      ['placementLog','Placement and hit log','result surface','service'],
      ['capacityConsole','Capacity controller','operational control','control']
    ]),
    flows: [
      ['edgeCaller','cacheRouter','request asset by cache key','The edge path needs the right cache owner before serving a static asset.'],
      ['cacheRouter','membershipRegistry','read ring epoch and namespace metadata','The router resolves the current cache membership and asset namespace.'],
      ['cacheRouter','placementEngine','compute owner for cache key','The key and ring epoch are handed to the placement engine as one routing decision.'],
      ['placementEngine','cacheRing','assign key to clockwise ring owners','The mechanism selects the cache node set responsible for this key.'],
      ['cacheRing','placementLog','record hit or miss by owner','Serving nodes publish placement outcomes for later rebalancing and audits.'],
      ['cacheRing','capacityConsole','signal hot partition or draining node','The boundary surfaces unhealthy ownership concentration before it causes an outage.'],
      ['capacityConsole','cacheRouter','add virtual capacity or reroute around failure','Operations adjust placement inputs without changing caller behavior.']
    ]
  },
  'distributed-algorithms::Leader election': {
    scenario: 'Only one invoice scheduler may issue month-end settlement jobs at any time.',
    components: place(LAYOUTS.control, [
      ['billingOperator','Billing operator','job caller','client'],
      ['schedulerSupervisor','Scheduler supervisor','coordinating service','service'],
      ['leaseRegistry','Lease registry','source of truth','storage'],
      ['schedulerReplicas','Invoice scheduler replicas','worker boundary','cluster'],
      ['electionModule','Leader election module','black-box mechanism','compute'],
      ['activeLedger','Active-job ledger','result surface','service'],
      ['failoverControl','Failover controller','operational control','control']
    ]),
    flows: [
      ['billingOperator','schedulerSupervisor','arm month-end settlement schedule','Operations enable the month-end workflow that exactly one scheduler may own.'],
      ['schedulerSupervisor','leaseRegistry','read current lease epoch and fencing state','The supervisor resolves the authoritative lease and job ownership state.'],
      ['schedulerSupervisor','schedulerReplicas','invite replicas into election round','Every healthy replica receives the current election epoch and participation rules.'],
      ['schedulerReplicas','electionModule','compete for active ownership','Replica heartbeats and lease claims flow into the election module.'],
      ['electionModule','activeLedger','record winning leader and fenced epoch','The chosen leader and epoch are committed for audit and downstream consumers.'],
      ['electionModule','failoverControl','report lost heartbeat or split-brain suspicion','Any stale leader or lease instability becomes an immediate failover event.'],
      ['failoverControl','schedulerSupervisor','demote stale leader and restart election','Operations can force a clean leadership handoff without manual datastore edits.']
    ]
  },
  'distributed-algorithms::Distributed snapshots': {
    scenario: 'SRE captures a consistent cross-service state during a payment incident.',
    components: place(LAYOUTS.graph, [
      ['incidentLead','Incident lead console','job caller','client'],
      ['snapshotCoordinator','Snapshot coordinator service','coordinating service','service'],
      ['runtimeStores','Runtime state stores','source of truth','storage'],
      ['snapshotRecorder','Distributed snapshot recorder','black-box mechanism','compute'],
      ['serviceAgents','Service-side agents','worker boundary','cluster'],
      ['forensicVault','Forensic snapshot vault','result surface','service'],
      ['incidentTools','Incident tooling','operational control','control']
    ]),
    flows: [
      ['incidentLead','snapshotCoordinator','request payment-system capture','The incident lead asks for a recoverable view of the live distributed system.'],
      ['snapshotCoordinator','runtimeStores','enumerate participants and state handles','The coordinator resolves the authoritative set of services and state sources.'],
      ['snapshotCoordinator','serviceAgents','instruct agents to mark snapshot epoch','Each service agent receives the capture request and the epoch to record.'],
      ['serviceAgents','snapshotRecorder','submit service state and channel markers','Agents hand capture artifacts into the snapshot recorder.'],
      ['snapshotRecorder','forensicVault','upload consistent incident package','The final snapshot is stored where debugging and compliance teams can inspect it.'],
      ['snapshotRecorder','incidentTools','report timed-out marker or missing participant','A broken participant is surfaced before responders trust incomplete evidence.'],
      ['incidentTools','snapshotCoordinator','retry scoped capture around failed zone','Operations can narrow the capture blast radius and try again quickly.']
    ]
  },
  'distributed-algorithms::Distributed sorting': {
    scenario: 'A compliance export globally orders trade events by event time before archival delivery.',
    components: place(LAYOUTS.pipeline, [
      ['complianceJob','Compliance export job','job caller','client'],
      ['exportCoordinator','Export coordinator','coordinating service','service'],
      ['tradeLake','Trade event lake','source of truth','storage'],
      ['sortWorkers','Sort worker fleet','worker boundary','cluster'],
      ['globalSortEngine','Global sort engine','black-box mechanism','compute'],
      ['orderedArchive','Ordered archive manifest','result surface','service'],
      ['backlogControl','Backlog controller','operational control','control']
    ]),
    flows: [
      ['complianceJob','exportCoordinator','request month-end ordered export','Compliance needs a globally ordered copy of trade events for the regulator.'],
      ['exportCoordinator','tradeLake','freeze event snapshot and schema','The coordinator pins the exact event generation and schema version to export.'],
      ['exportCoordinator','sortWorkers','assign time ranges and spill budget','Workers receive partition ownership and the guardrails for large sorts.'],
      ['sortWorkers','globalSortEngine','produce globally ordered slices','Workers hand their prepared slices into the sort engine for one global ordering step.'],
      ['globalSortEngine','orderedArchive','publish ordered manifest and file set','The resulting archive is ready for regulator delivery and downstream verification.'],
      ['globalSortEngine','backlogControl','warn on skewed time bucket or spill pressure','Operational telemetry surfaces when one date range dominates the batch.'],
      ['backlogControl','exportCoordinator','split hot range and resume remaining work','Operations can rebalance only the failing range while preserving finished output.']
    ]
  },
  'distributed-algorithms::Distributed aggregation': {
    scenario: 'Fleet health rolls up host capacity signals into region and global availability views.',
    components: place(LAYOUTS.fanout, [
      ['nocDashboard','NOC dashboard','job caller','client'],
      ['healthApi','Health aggregation API','coordinating service','service'],
      ['heartbeatLedger','Host heartbeat ledger','source of truth','storage'],
      ['collectorFleet','Regional collector fleet','worker boundary','cluster'],
      ['treeAggregator','Tree aggregation engine','black-box mechanism','compute'],
      ['availabilityStore','Availability view store','result surface','service'],
      ['incidentController','Incident controller','operational control','control']
    ]),
    flows: [
      ['nocDashboard','healthApi','request fresh fleet availability','Operations asks for the latest global and per-region capacity view.'],
      ['healthApi','heartbeatLedger','read latest heartbeat epoch','The API binds the rollup to one coherent heartbeat cut across the fleet.'],
      ['healthApi','collectorFleet','request regional partial summaries','Collectors receive the rollup request for the regions they own.'],
      ['collectorFleet','treeAggregator','submit regional capacity partials','Regional partials flow into the aggregation engine for global composition.'],
      ['treeAggregator','availabilityStore','publish region and global availability rows','The combined view is written where dashboards and alerting can consume it.'],
      ['treeAggregator','incidentController','report missing regional partial or duplicate feed','Aggregation anomalies become operations issues before dashboards lie.'],
      ['incidentController','healthApi','quarantine bad region and recompute from raw heartbeats','Operations can exclude corrupt partials and regenerate the trusted global view.']
    ]
  }
};

window.SYSTEM_DESIGN_PRODUCTION_CONTEXTS = Object.assign({}, window.SYSTEM_DESIGN_PRODUCTION_CONTEXTS || {}, contexts);
}());
