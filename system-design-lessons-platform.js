(function () {
  'use strict';

  const lessons = {};
  const layouts = [
    [[8, 50], [28, 20], [28, 80], [55, 50], [78, 20], [92, 50]],
    [[10, 18], [10, 82], [35, 50], [62, 18], [62, 82], [90, 50]],
    [[8, 50], [30, 15], [30, 50], [30, 85], [65, 30], [90, 60]],
    [[12, 15], [12, 50], [12, 85], [48, 50], [78, 20], [88, 70]]
  ];

  function entitySet(specs, layoutIndex) {
    const layout = layouts[layoutIndex % layouts.length];
    return specs.map((spec, index) => [
      spec[0], spec[1], spec[2], layout[index][0], layout[index][1]
    ]);
  }

  function add(chapter, concept, family, scenario, specs, connections, facts, invariant, layoutIndex) {
    const entities = entitySet(specs, layoutIndex);
    const ids = entities.map(entity => entity[0]);
    const states = {};

    lessons[`${chapter}::${concept}`] = {
      family,
      scenario,
      entities,
      connections,
      steps: facts.map((fact, index) => {
        const snapshot = {};
        ids.forEach(id => {
          snapshot[id] = {
            phase: `${index + 1}/5`,
            status: states[id] ? states[id].status : 'waiting',
            detail: states[id] ? states[id].detail : 'No work accepted in this phase'
          };
        });
        Object.entries(fact.s).forEach(([id, state]) => {
          states[id] = { status: state[0], detail: state[1] };
          snapshot[id] = {
            phase: `${index + 1}/5`,
            status: state[0],
            detail: state[1]
          };
        });
        return {
          title: fact.t,
          narration: fact.n,
          action: fact.a,
          states: snapshot,
          outcome: fact.o,
          invariant
        };
      })
    };
  }

  add('api-service-architecture', 'API Gateway', 'gateway',
    'A mobile checkout request crosses the public edge while authentication, quota, and version policy remain centralized.',
    [['phone', 'Shopper App', 'HTTPS client using API v2'], ['waf', 'Edge WAF', 'TLS and threat filter'], ['gateway', 'Checkout Gateway', 'JWT, quota, and path policy'], ['catalog', 'Catalog API', 'Product read owner'], ['orders', 'Orders API', 'Order write owner'], ['audit', 'Edge Audit Stream', 'Decision evidence']],
    [['phone', 'waf', 'TLS 1.3 POST /v2/orders'], ['waf', 'gateway', 'Sanitized HTTP/2 request'], ['gateway', 'catalog', 'GET /products/SKU-42'], ['gateway', 'orders', 'POST /orders with user context'], ['gateway', 'audit', 'Policy decision event']],
    [
      {t:'Terminate the public session', a:['phone','waf','TLS handshake; SNI=api.shop.example'], n:'The WAF terminates TLS 1.3 and blocks a malformed content length before any private address is exposed.', o:'Only a normalized request enters the private edge.', s:{phone:['connected','POST /v2/orders; request req-7f2'],waf:['accepted','TLS cipher TLS_AES_256_GCM_SHA384']}},
      {t:'Enforce identity and quota', a:['waf','gateway','Forward req-7f2 with bearer token'], n:'The gateway validates iss=https://id.shop.example, aud=checkout-api, sub=user-1042, then consumes one unit from quota 117/1000.', o:'The request has an authenticated principal and remaining budget.', s:{gateway:['authorized','sub=user-1042; scope=orders.write; quota=883']}},
      {t:'Read the product contract', a:['gateway','catalog','GET /products/SKU-42; deadline=80ms'], n:'The gateway selects Catalog API v3 and passes an 80 ms hop deadline rather than the client timeout.', o:'SKU-42 resolves to price USD 49.00 in 18 ms.', s:{catalog:['returned','SKU-42; schema=product.v3; duration=18ms']}},
      {t:'Create exactly one order', a:['gateway','orders','POST /orders; Idempotency-Key=ord-7f2'], n:'Orders API receives the validated user context and idempotency key, not the original untrusted authorization header.', o:'Order O-90017 is committed once.', s:{orders:['committed','order=O-90017; amount=USD49.00; key=ord-7f2']}},
      {t:'Record the edge decision', a:['gateway','audit','Append gateway.decision.v2'], n:'The audit event captures request ID, policy version gw-2026.09.17, subject, target, and HTTP 201 without storing the token.', o:'Operators can reconstruct why the call was allowed.', s:{audit:['persisted','req-7f2; allow; policy=gw-2026.09.17'],phone:['complete','201 Created; order=O-90017']}}
    ], 'The gateway authenticates and limits traffic, but Orders API remains the authority for order authorization and durability.', 0);

  add('api-service-architecture', 'L4 vs L7 load balancing', 'gateway',
    'A payments endpoint separates high-throughput TCP distribution from HTTP-aware canary selection.',
    [['client', 'Merchant SDK', 'HTTP/2 payment client'], ['l4', 'Regional L4 VIP', 'Five-tuple TCP distributor'], ['l7', 'Envoy L7 Pool', 'HTTP policy and canary selector'], ['stable', 'Payments v8', 'Stable 95% backend'], ['canary', 'Payments v9', 'Canary 5% backend'], ['health', 'Health Controller', 'Endpoint readiness source']],
    [['client','l4','TCP 443 flow'], ['l4','l7','NAT to healthy proxy'], ['l7','stable','95% POST /charges'], ['l7','canary','5% POST /charges'], ['health','l4','TCP endpoint health'], ['health','l7','HTTP readiness and outlier state']],
    [
      {t:'Distribute the TCP flow',a:['client','l4','SYN from 203.0.113.8:51120'],n:'The L4 VIP hashes source IP, source port, destination IP, destination port, and protocol without parsing HTTP.',o:'One long-lived TCP flow lands on Envoy proxy e-12.',s:{client:['connected','HTTP/2 over TCP flow f-81'],l4:['selected','five-tuple hash -> e-12']}},
      {t:'Inspect the HTTP request',a:['l4','l7','Forward encrypted flow after TLS passthrough'],n:'Envoy terminates TLS and reads :path=/charges, x-tenant=contoso, and x-release-cohort=canary.',o:'Application attributes are available for L7 policy.',s:{l7:['classified','tenant=contoso; path=/charges; cohort=canary']}},
      {t:'Send the canary cohort',a:['l7','canary','POST /charges to v9'],n:'The L7 rule sends cohort canary to v9 even though the global weight remains 5 percent.',o:'The selected request exercises Payments v9.',s:{canary:['serving','request=pay-301; release=v9; duration=42ms'],stable:['healthy','weight=95%; inflight=831']}},
      {t:'Eject an unhealthy endpoint',a:['health','l7','Mark v9 pod p9-3 outlier'],n:'Three consecutive HTTP 503 responses eject p9-3 for 30 seconds; the L4 VIP could only see that TCP was open.',o:'New canary requests avoid the semantically unhealthy pod.',s:{health:['degraded','p9-3: HTTP failure; TCP still open'],l7:['updated','p9-3 ejected until 13:04:30Z']}},
      {t:'Preserve transport capacity',a:['health','l4','Keep e-12 in TCP pool'],n:'The L4 tier continues spreading connections across proxies while L7 independently manages payment semantics.',o:'Transport and application balancing fail independently.',s:{l4:['healthy','4 proxy endpoints; 12,440 flows'],client:['complete','201 charge=ch_8821 via v9']}}
    ], 'L4 decisions use transport state only; any decision based on path, headers, status codes, or cohorts belongs at L7.', 1);

  add('api-service-architecture', 'Service discovery', 'gateway',
    'An inventory caller tracks rapidly changing pod endpoints without embedding addresses in application configuration.',
    [['caller','Cart API','Inventory client'],['dns','Inventory DNS','Logical name resolver'],['registry','Endpoint Registry','Lease-backed endpoint catalog'],['pod1','Inventory Pod i-17','Ready zone-a endpoint'],['pod2','Inventory Pod i-23','Draining zone-b endpoint'],['probe','Readiness Prober','Health publisher']],
    [['caller','dns','A/AAAA inventory.prod'],['dns','registry','Resolve service membership'],['registry','pod1','10.4.1.17:8443 lease'],['registry','pod2','10.4.2.23:8443 lease'],['probe','registry','Readiness and lease updates']],
    [
      {t:'Register a leased endpoint',a:['pod1','registry','Publish 10.4.1.17:8443; TTL=30s'],n:'Pod i-17 registers only after loading catalog shard 12 and presents lease epoch 884.',o:'The registry has one eligible inventory endpoint.',s:{pod1:['ready','shard=12; leaseEpoch=884'],registry:['published','i-17 ready; expires=13:04:15Z']}},
      {t:'Resolve the logical name',a:['caller','dns','Resolve inventory.prod'],n:'Cart API asks for inventory.prod, not a pod IP; DNS returns i-17 and i-23 with a 10 second cache lifetime.',o:'The caller receives bounded-staleness membership.',s:{caller:['resolved','i-17,i-23; cacheUntil=13:03:55Z'],dns:['answered','A=10.4.1.17,10.4.2.23; TTL=10']}},
      {t:'Detect a draining pod',a:['probe','registry','Set i-23 ready=false'],n:'The readiness probe sees termination draining=true before the process exits and revokes i-23 lease epoch 219.',o:'The registry stops advertising i-23.',s:{pod2:['draining','inflight=7; acceptsNew=false'],registry:['updated','i-17 only; revision=9012']}},
      {t:'Refresh stale membership',a:['dns','registry','Read revision 9012'],n:'After TTL expiry, DNS refreshes from registry revision 9012 and removes 10.4.2.23.',o:'New callers no longer select the draining address.',s:{dns:['refreshed','A=10.4.1.17; TTL=10; revision=9012'],caller:['cache expired','previous revision=9009']}},
      {t:'Call the ready owner',a:['caller','pod1','GET /stock/SKU-42'],n:'Cart API connects to i-17 with a 50 ms deadline and receives stock=31 from shard 12.',o:'Discovery converges without application redeployment.',s:{caller:['complete','stock=31; endpoint=i-17; duration=12ms'],pod1:['served','SKU-42; shard=12; duration=12ms']}}
    ], 'Only endpoints with a live lease and positive readiness are returned; callers treat cached membership as expiring data.', 2);

  add('api-service-architecture', 'Service mesh', 'gateway',
    'Order and fraud workloads gain uniform mTLS, retries, and telemetry through colocated proxies without trusting the pod network.',
    [['order','Orders Container','Business workload'],['orderProxy','Orders Sidecar','Outbound policy enforcement'],['fraudProxy','Fraud Sidecar','Inbound policy enforcement'],['fraud','Fraud Container','Risk evaluator'],['ca','Mesh CA','SPIFFE certificate issuer'],['collector','Trace Collector','Span receiver']],
    [['order','orderProxy','Loopback HTTP request'],['orderProxy','fraudProxy','mTLS SPIFFE exchange'],['fraudProxy','fraud','Loopback HTTP request'],['ca','orderProxy','SVID spiffe://prod/orders'],['ca','fraudProxy','SVID spiffe://prod/fraud'],['orderProxy','collector','OTLP client span']],
    [
      {t:'Issue workload identities',a:['ca','orderProxy','Issue 30-minute X.509 SVID'],n:'The mesh CA attests pod service accounts and issues distinct SVIDs for Orders and Fraud.',o:'Both proxies have short-lived peer identities.',s:{ca:['issued','serials=71A2,91F0; expires=13:33Z'],orderProxy:['credential ready','spiffe://prod/orders; serial=71A2'],fraudProxy:['credential ready','spiffe://prod/fraud; serial=91F0']}},
      {t:'Capture the outbound call',a:['order','orderProxy','POST /risk over 127.0.0.1:15001'],n:'Orders sends order O-90017 locally; the application never handles mesh private keys.',o:'Outbound policy owns the network hop.',s:{order:['waiting','order=O-90017; deadline=100ms'],orderProxy:['intercepted','cluster=fraud.prod; attempt=1']}},
      {t:'Authenticate both workloads',a:['orderProxy','fraudProxy','mTLS with SPIFFE SANs'],n:'Each sidecar verifies the peer certificate chain and exact SPIFFE trust domain before HTTP bytes pass.',o:'The connection binds Orders to Fraud cryptographically.',s:{orderProxy:['authenticated','peer=spiffe://prod/fraud; TLS1.3'],fraudProxy:['authenticated','peer=spiffe://prod/orders; policy=allow']}},
      {t:'Evaluate fraud risk',a:['fraudProxy','fraud','POST /risk; x-order=O-90017'],n:'Fraud evaluates amount USD49 and device d-81 in 23 ms, returning risk=0.08.',o:'The business response returns through the authenticated channel.',s:{fraud:['returned','risk=0.08; model=fraud-2026-09; 23ms'],fraudProxy:['response','HTTP 200; responseBytes=38']}},
      {t:'Export causal telemetry',a:['orderProxy','collector','OTLP span orders->fraud'],n:'The sidecar exports trace 4bf92f3577b34da6a3ce929d0e0e4736 and span 00f067aa0ba902b7 with peer identity and 31 ms duration.',o:'Operators see policy and latency without code-specific exporters.',s:{collector:['stored','trace=4bf92f...4736; span=00f067aa0ba902b7; 31ms'],order:['complete','risk=0.08; total=34ms']}}
    ], 'The mesh authenticates transport peers and applies network policy; the Fraud application still authorizes the requested business action.', 3);

  add('api-service-architecture', 'Control plane vs data plane', 'gateway',
    'A global traffic policy update must reach proxies without making request serving depend on the controller.',
    [['operator','Release Operator','Desired-state author'],['control','Traffic Controller','Policy compiler'],['store','Policy Store','Versioned desired state'],['proxyA','Zone A Proxy','Request data plane'],['proxyB','Zone B Proxy','Request data plane'],['backend','Search v12','Serving backend']],
    [['operator','control','Set search v12 weight'],['control','store','Commit policy revision'],['store','proxyA','Watch revision stream'],['store','proxyB','Watch revision stream'],['proxyA','backend','Serve weighted traffic'],['proxyB','backend','Serve weighted traffic']],
    [
      {t:'Submit desired state',a:['operator','control','Set v12 weight=10%'],n:'The operator requests 10 percent Search v12 traffic with max error rate 1 percent.',o:'The control plane receives an auditable intent.',s:{operator:['submitted','change=chg-812; v12=10%'],control:['validating','guardrail errorRate<1%']}},
      {t:'Compile an immutable revision',a:['control','store','Write policy revision 441'],n:'The controller validates backend names and emits checksum sha256:8c4e for revision 441.',o:'One versioned policy can be acknowledged independently.',s:{store:['committed','revision=441; checksum=8c4e; v12=10%'],control:['published','revision=441']}},
      {t:'Apply in zone A',a:['store','proxyA','Deliver revision 441'],n:'Zone A verifies checksum 8c4e, warms Search v12 connections, then atomically swaps policy.',o:'Zone A serves the new split.',s:{proxyA:['active','revision=441; v12=10%; ack=true'],backend:['serving','zoneA requests=101/s']}},
      {t:'Survive controller loss',a:null,n:'The traffic controller restarts while both proxies continue using their last verified snapshots.',o:'Request serving remains available with bounded configuration staleness.',s:{control:['unavailable','restart; no request-path dependency'],proxyB:['serving stale','revision=440; v12=0%; ack pending']}},
      {t:'Converge zone B',a:['store','proxyB','Replay revision 441'],n:'After reconnect, zone B verifies revision 441 and reports its acknowledgement.',o:'Both data planes converge without dropping requests.',s:{control:['healthy','acks A=441,B=441'],proxyB:['active','revision=441; v12=10%; ack=true'],backend:['serving','global v12 traffic=10.1%']}}
    ], 'The data plane serves from a locally verified last-known-good snapshot and never synchronously calls the control plane per request.', 0);

  add('api-service-architecture', 'Canary deployments', 'gateway',
    'A checkout release advances through measured traffic rings with automatic rollback on an SLO burn signal.',
    [['pipeline','Release Pipeline','Checkout v42 deployer'],['director','Traffic Director','Weighted cohort owner'],['stable','Checkout v41','Stable revision'],['canary','Checkout v42','Candidate revision'],['metrics','SLO Evaluator','Error and latency judge'],['users','Checkout Clients','Production demand']],
    [['pipeline','canary','Deploy image sha256:42aa'],['director','stable','Weighted production traffic'],['director','canary','Canary production traffic'],['users','director','POST /checkout'],['stable','metrics','v41 RED metrics'],['canary','metrics','v42 RED metrics']],
    [
      {t:'Deploy dark capacity',a:['pipeline','canary','Start v42 with weight=0%'],n:'The pipeline deploys checksum sha256:42aa and passes readiness plus synthetic checkout before exposure.',o:'v42 is warm but receives no customer traffic.',s:{pipeline:['verified','image=sha256:42aa; schema compatible=true'],canary:['ready','20 pods; weight=0%']}},
      {t:'Open the one-percent ring',a:['director','canary','Set deterministic weight=1%'],n:'Tenant hashing keeps each shopper on one revision while 1 percent of traffic reaches v42.',o:'v42 serves about 120 requests per second.',s:{director:['active','v41=99%; v42=1%; policy=rev91'],stable:['serving','11,880 rps'],canary:['serving','120 rps']}},
      {t:'Compare release health',a:['canary','metrics','Publish RED window 5m'],n:'The evaluator compares v42 error=0.18 percent and p95=184 ms against v41 error=0.16 percent and p95=179 ms.',o:'The first ring stays within its 0.3 percent error guardrail.',s:{metrics:['pass','v42 err=0.18%; p95=184ms; samples=36k']}},
      {t:'Advance to ten percent',a:['director','canary','Set weight=10%'],n:'The director advances only after a full five-minute window and retains deterministic tenant assignment.',o:'v42 receives broader production diversity.',s:{director:['active','v41=90%; v42=10%; policy=rev92'],canary:['serving','1,210 rps; tenants=8,412']}},
      {t:'Rollback on budget burn',a:['metrics','director','Trigger rollback: error=1.8%'],n:'A payment timeout regression raises the v42 five-minute error rate to 1.8 percent; the director returns its weight to zero in 12 seconds.',o:'New traffic returns to v41 while v42 evidence is retained.',s:{metrics:['failed','v42 err=1.8%; burn=6.0x; culprit=payment timeout'],director:['rolled back','v41=100%; v42=0%; policy=rev93'],users:['protected','checkout success=99.82%']}}
    ], 'Traffic advances only after a complete healthy observation window, and rollback never requires redeploying the stable revision.', 1);

  const identityChapter = 'distributed-identity-security';

  add(identityChapter, 'OAuth 2.0', 'identity',
    'A photo-printing application obtains bounded delegated access to a user album without learning the user password.',
    [['user','User Browser','Resource owner'],['client','Print App','Public OAuth client'],['authz','Authorization Server','Consent and token issuer'],['api','Photos API','Resource server'],['album','Album A-17','Protected resource']],
    [['user','client','Start print job'],['client','authz','Authorization code + PKCE'],['authz','client','Access token response'],['client','api','Bearer access token'],['api','album','Read selected photos']],
    [
      {t:'Create the PKCE binding',a:['client','authz','Authorize with code_challenge=S256'],n:'The public client creates verifier v-71 and sends only its SHA-256 challenge with redirect URI app://oauth/callback.',o:'A stolen authorization code cannot be redeemed without v-71.',s:{client:['pending','state=s-992; verifier=v-71 retained'],authz:['authorize','client_id=print-mobile; challengeMethod=S256']}},
      {t:'Capture narrow consent',a:['user','authz','Approve photos.read for album A-17'],n:'The authorization server authenticates user 1042 and displays client, scope, and album audience before consent.',o:'Consent is limited to read access.',s:{user:['consented','client=print-mobile; scope=photos.read'],authz:['code issued','code=c-81; user=1042; expires=60s']}},
      {t:'Redeem the code',a:['client','authz','POST /token with verifier v-71'],n:'The server recomputes the S256 challenge, consumes code c-81 once, and issues a five-minute access token.',o:'The client receives delegated authority, not user credentials.',s:{authz:['token issued','jti=at-551; aud=photos-api; exp=13:09Z'],client:['token held','scope=photos.read; tokenType=Bearer']}},
      {t:'Present resource authority',a:['client','api','GET /albums/A-17 with token at-551'],n:'Photos API validates issuer, audience photos-api, expiry, and scope photos.read.',o:'The API binds the token to the intended resource server.',s:{api:['authorized','sub=user-1042; client=print-mobile; album=A-17']}},
      {t:'Return only allowed photos',a:['api','album','Read album A-17'],n:'The API returns JPEG object IDs 7 and 8 but denies a subsequent DELETE because photos.write is absent.',o:'Delegation grants the minimum requested operation.',s:{album:['read','objects=7,8; delete denied'],client:['complete','2 photos received; no refresh token']}}
    ], 'An access token is accepted only by its named audience and only for the consented scope, client, subject, and lifetime.', 2);

  add(identityChapter, 'OIDC', 'identity',
    'A workforce dashboard signs in an employee and distinguishes the identity token from an API access token.',
    [['browser','Employee Browser','OIDC user agent'],['web','Analytics Web App','Confidential relying party'],['issuer','Workforce IdP','OIDC provider'],['userinfo','UserInfo Endpoint','Claims endpoint'],['api','Reports API','Separate OAuth resource']],
    [['browser','web','Begin sign-in'],['web','issuer','Authorization request'],['issuer','web','Code and ID token'],['web','userinfo','Access token for UserInfo'],['web','api','Reports access token']],
    [
      {t:'Bind the sign-in request',a:['web','issuer','Authorize nonce=n-414; state=s-902'],n:'The web app sends client_id=analytics-web, redirect URI, nonce, state, and PKCE challenge.',o:'The response can be bound to this browser session.',s:{web:['pending','nonce=n-414; state=s-902'],issuer:['request accepted','scope=openid profile; client=analytics-web']}},
      {t:'Authenticate the employee',a:['browser','issuer','Pass phishing-resistant MFA'],n:'The IdP authenticates employee e-204 with FIDO2 and records acr=urn:mfa:fido2 and auth_time=1726949000.',o:'A concrete authentication event backs the session.',s:{browser:['authenticated','employee=e-204; method=FIDO2'],issuer:['session','sid=idp-77; acr=urn:mfa:fido2']}},
      {t:'Validate the ID token',a:['issuer','web','Return code and signed ID token'],n:'The app validates iss=https://login.corp.example, aud=analytics-web, nonce=n-414, exp, and signature kid=oidc-2026-09.',o:'The app establishes employee e-204 as the signed-in subject.',s:{web:['signed in','sub=e-204; aud=analytics-web; nonce matched'],issuer:['issued','ID token kid=oidc-2026-09; exp=13:09Z']}},
      {t:'Fetch optional profile claims',a:['web','userinfo','GET /userinfo with token ui-991'],n:'A UserInfo access token with aud=userinfo returns name and department; the ID token is not sent to Reports API.',o:'Profile retrieval remains separately authorized.',s:{userinfo:['returned','sub=e-204; department=Finance'],web:['profile loaded','name=Riley; department=Finance']}},
      {t:'Use the API token correctly',a:['web','api','GET /reports with token rpt-442'],n:'Reports API accepts aud=reports-api and scope=reports.read, while it would reject the ID token audience analytics-web.',o:'Authentication and API authorization use different tokens.',s:{api:['authorized','sub=e-204; aud=reports-api; scope=reports.read'],browser:['complete','dashboard session sid=web-22']}}
    ], 'ID tokens prove authentication to the relying party; resource APIs accept only access tokens minted for their own audience.', 3);

  add(identityChapter, 'JWT', 'identity',
    'A warehouse API verifies a compact signed token locally while treating every claim as issuer-controlled input.',
    [['scanner','Warehouse Scanner','Bearer-token client'],['issuer','Logistics Issuer','JWT signer'],['api','Warehouse API','JWT verifier'],['keys','Issuer Key Cache','Public key cache'],['bin','Bin B-19','Protected inventory']],
    [['issuer','scanner','Signed compact JWT'],['scanner','api','Bearer eyJ...'],['api','keys','Select kid log-7'],['api','bin','PATCH quantity']],
    [
      {t:'Mint explicit claims',a:['issuer','scanner','Issue JWT jti=jwt-881'],n:'The issuer signs alg=RS256, kid=log-7 with iss=https://id.logistics.example, aud=warehouse-api, sub=device-81, exp=1726949300, scope=inventory.adjust.',o:'The scanner receives a bounded assertion.',s:{issuer:['signed','kid=log-7; alg=RS256; jti=jwt-881'],scanner:['token held','aud=warehouse-api; exp in 5m']}},
      {t:'Parse without trusting',a:['scanner','api','PATCH /bins/B-19 quantity=-1'],n:'The API base64url-decodes header and payload only to select validation policy; decoded claims are not yet identity.',o:'Unverified input cannot authorize the write.',s:{api:['unverified','header kid=log-7; claimed sub=device-81']}},
      {t:'Verify the signature',a:['api','keys','Load RSA public key log-7'],n:'The API requires RS256, finds kid log-7 under the configured issuer, and verifies the JWS signing input.',o:'Claims are cryptographically bound to the trusted issuer key.',s:{keys:['cache hit','kid=log-7; thumbprint=9A:31'],api:['signature valid','alg=RS256; issuer key=log-7']}},
      {t:'Validate semantic claims',a:null,n:'The API checks exact issuer, audience warehouse-api, nbf, exp with 60-second skew, jti, and inventory.adjust scope.',o:'The token is valid for this operation now.',s:{api:['claims valid','iss matched; aud matched; ttl=241s; scope present']}},
      {t:'Apply the inventory change',a:['api','bin','Decrement SKU-42 from 9 to 8'],n:'Authorization binds device-81 to warehouse WH-3 before mutating bin B-19.',o:'The signed request changes only its assigned warehouse.',s:{bin:['updated','SKU-42 quantity=8; actor=device-81'],scanner:['complete','HTTP 200; ETag=bin-77']}}
    ], 'JWT decoding never establishes trust; algorithm, signature, issuer, audience, time, and operation-specific claims all pass before use.', 0);

  add(identityChapter, 'JWKS', 'identity',
    'A resource server refreshes public signing keys safely when it sees an unfamiliar key ID.',
    [['issuer','Accounts Issuer','Token signer'],['jwks','JWKS Endpoint','Public key publisher'],['cache','API JWKS Cache','Issuer-key cache'],['api','Billing API','Token verifier'],['client','Billing Client','Bearer-token caller']],
    [['issuer','jwks','Publish RSA public keys'],['jwks','cache','HTTPS JWKS document'],['client','api','Token kid=acct-2026b'],['api','cache','Resolve issuer plus kid']],
    [
      {t:'Cache the known key set',a:['jwks','cache','GET /.well-known/jwks.json'],n:'The cache stores acct-2026a, kty=RSA, use=sig, alg=RS256 for issuer https://accounts.example with max-age=300.',o:'Normal validation avoids a network call.',s:{jwks:['served','keys=[acct-2026a]; ETag=jwks-81'],cache:['fresh','issuer=accounts; kid=acct-2026a; age=0s']}},
      {t:'Receive an unknown key ID',a:['client','api','GET /invoices; kid=acct-2026b'],n:'Billing API finds a trusted issuer but no matching kid in its cached set.',o:'The token is paused, not accepted with a different key.',s:{client:['waiting','token jti=bil-717; kid=acct-2026b'],api:['key miss','issuer=accounts; kid=acct-2026b']}},
      {t:'Refresh once with bounds',a:['api','jwks','Conditional GET ETag=jwks-81'],n:'A single-flight refresh prevents attacker-controlled kid values from causing parallel fetch storms.',o:'The API obtains the rotated document once.',s:{jwks:['served','keys=[acct-2026a,acct-2026b]; ETag=jwks-82'],api:['refreshing','single-flight waiters=14']}},
      {t:'Index by issuer and key ID',a:['jwks','cache','Store ETag jwks-82'],n:'The cache validates HTTPS origin and document shape, then indexes acct-2026b only under https://accounts.example.',o:'Key IDs cannot collide across issuers.',s:{cache:['fresh','acct-2026a + acct-2026b; maxAge=300s']}},
      {t:'Retry signature verification',a:['api','cache','Resolve acct-2026b'],n:'Billing API verifies RS256 with modulus fingerprint 4D:92 and then validates token claims.',o:'The request succeeds after safe key discovery.',s:{api:['authorized','kid=acct-2026b; aud=billing-api; sub=client-17'],client:['complete','invoice list HTTP 200']}}
    ], 'A kid selects among already trusted issuer keys; it never chooses the issuer, algorithm, URL, or trust anchor.', 1);

  add(identityChapter, 'Access-token validation', 'identity',
    'A payroll API rejects tokens that are correctly signed but intended for another resource.',
    [['client','HR Portal','Payroll caller'],['issuer','Corporate STS','Access-token issuer'],['api','Payroll API','Validation and enforcement'],['keys','Payroll Key Cache','Corporate issuer keys'],['ledger','Payroll Ledger','Salary resource']],
    [['issuer','client','Access token'],['client','api','GET /salary/E-204'],['api','keys','Verify kid corp-19'],['api','ledger','Read authorized salary']],
    [
      {t:'Receive the presented token',a:['client','api','GET /salary/E-204'],n:'The portal sends jti=tok-992 claiming iss=https://sts.corp.example, aud=graph-api, sub=E-204.',o:'The API has an untrusted candidate token.',s:{client:['sent','jti=tok-992; aud=graph-api'],api:['received','request=pay-88; token bytes=911']}},
      {t:'Verify issuer signature',a:['api','keys','Resolve corp-19 and verify RS256'],n:'The signature is valid under corporate key corp-19, proving origin but not suitability for Payroll.',o:'Cryptographic validation completes.',s:{keys:['cache hit','kid=corp-19; issuer=corporate STS'],api:['signature valid','jti=tok-992']}},
      {t:'Reject the wrong audience',a:null,n:'Exact audience validation expects payroll-api and finds graph-api, so processing stops before ledger access.',o:'A valid Graph token cannot cross the Payroll trust boundary.',s:{api:['denied','401 invalid_token; expected aud=payroll-api; actual=graph-api']}},
      {t:'Present a resource token',a:['issuer','client','Issue jti=tok-993 aud=payroll-api'],n:'The client acquires a new token with aud=payroll-api, scope=salary.read, sub=E-204, exp=13:08Z.',o:'The authority is targeted to Payroll.',s:{issuer:['issued','jti=tok-993; aud=payroll-api; scope=salary.read'],client:['retrying','token jti=tok-993']}},
      {t:'Authorize the subject and scope',a:['api','ledger','Read salary for E-204'],n:'Payroll validates signature, issuer, audience, lifetime, tenant, scope, and that self-service subject E-204 matches the requested employee.',o:'Only E-204 salary data is returned.',s:{api:['authorized','sub=E-204; scope=salary.read; tenant=corp'],ledger:['read','employee=E-204; fields=basePay,currency'],client:['complete','HTTP 200']}}
    ], 'A valid signature is necessary but never sufficient; issuer, audience, lifetime, tenant, subject, and required permission are independently enforced.', 2);

  add(identityChapter, 'Key rotation', 'trust',
    'A token issuer rotates an RSA signing key without rejecting tokens signed before the change.',
    [['hsm','Issuer HSM','Private signing keys'],['issuer','Identity Issuer','Token minting service'],['jwks','Public JWKS','Verification-key set'],['apiA','Orders API','Fast-refresh verifier'],['apiB','Reports API','Slow-refresh verifier'],['client','Workload Client','Token holder']],
    [['hsm','issuer','Sign with active key'],['issuer','jwks','Publish public JWKs'],['issuer','client','Issue access token'],['client','apiA','Token validation'],['client','apiB','Token validation']],
    [
      {t:'Publish the next public key',a:['issuer','jwks','Add kid=k-2026b before use'],n:'The issuer creates RSA key k-2026b in the HSM and publishes its public JWK beside active k-2026a.',o:'Verifiers can learn the next key before tokens use it.',s:{hsm:['generated','k-2026b private non-exportable'],jwks:['overlap','kids=[k-2026a,k-2026b]']}},
      {t:'Warm verifier caches',a:['jwks','apiA','Refresh kids a and b'],n:'Orders refreshes immediately; Reports retains k-2026a until its 300-second cache expires.',o:'At least one verifier confirms propagation.',s:{apiA:['ready','kids=[k-2026a,k-2026b]'],apiB:['stale safe','kids=[k-2026a]; refresh in 70s']}},
      {t:'Activate the new signer',a:['hsm','issuer','Set active kid=k-2026b'],n:'After the maximum JWKS propagation interval, the issuer signs new token jti=rot-44 with k-2026b.',o:'New issuance uses the rotated key.',s:{issuer:['active','signing kid=k-2026b'],client:['token held','jti=rot-44; kid=k-2026b; exp=13:13Z']}},
      {t:'Keep the old key verifiable',a:['client','apiB','Present older token kid=k-2026a'],n:'Reports still validates an unexpired k-2026a token while refreshing and then learns k-2026b.',o:'Rotation causes no outage for old tokens.',s:{apiB:['refreshed','kids=[k-2026a,k-2026b]; old token accepted']}},
      {t:'Retire after token expiry',a:['issuer','jwks','Remove kid=k-2026a'],n:'After the last k-2026a token expiry plus clock-skew allowance, the old public key is removed and private material is destroyed.',o:'Only k-2026b remains trusted.',s:{jwks:['active','kids=[k-2026b]; ETag=93'],hsm:['destroyed','k-2026a tombstone=rotation-778'],apiA:['ready','kid=k-2026b only']}}
    ], 'The new public key is distributed before first use, and the old verification key remains until every token it signed is expired.', 3);

  add(identityChapter, 'Workload identity federation', 'trust',
    'A CI job exchanges a GitHub OIDC assertion for a short-lived cloud deployment token without a stored cloud secret.',
    [['runner','GitHub Actions Job','External workload'],['github','GitHub OIDC Issuer','Signed job assertion'],['sts','Cloud Federation STS','Trust-policy evaluator'],['policy','Federation Policy','Issuer-subject mapping'],['deploy','Deployment API','Cloud resource server']],
    [['runner','github','Request OIDC assertion'],['github','runner','JWT for repository job'],['runner','sts','Token exchange'],['policy','sts','Federation trust rule'],['runner','deploy','Short-lived cloud token']],
    [
      {t:'Request a job assertion',a:['runner','github','Request aud=cloud-sts'],n:'GitHub issues kid=gh-91 with iss=https://token.actions.githubusercontent.com, sub=repo:acme/shop:ref:refs/heads/main, aud=cloud-sts.',o:'The external workload has a signed, short-lived identity.',s:{github:['issued','jti=gh-771; exp=10m; kid=gh-91'],runner:['assertion held','repo=acme/shop; ref=main']}},
      {t:'Present the external assertion',a:['runner','sts','RFC 8693 token exchange'],n:'The runner asks for cloud audience deploy-api and scope releases.write; no cloud client secret is sent.',o:'The STS receives proof of workload provenance.',s:{sts:['validating','issuer=GitHub; requested aud=deploy-api']}},
      {t:'Evaluate the trust mapping',a:['policy','sts','Match repository and branch'],n:'Policy fic-44 allows only the exact issuer, audience cloud-sts, repository acme/shop, and main branch subject.',o:'Forks and pull-request subjects do not match.',s:{policy:['matched','fic-44 -> principal ci-shop-main'],sts:['trusted','external sub mapped to ci-shop-main']}},
      {t:'Mint local authority',a:['sts','runner','Issue cloud token ctk-881'],n:'The STS issues a five-minute token with iss=https://sts.cloud.example, sub=ci-shop-main, aud=deploy-api, scope=releases.write.',o:'Cloud authority is local, narrow, and ephemeral.',s:{sts:['issued','jti=ctk-881; exp=13:08Z'],runner:['cloud token','sub=ci-shop-main; no refresh token']}},
      {t:'Deploy with federated identity',a:['runner','deploy','POST /releases/shop-v42'],n:'Deployment API validates the local token and records the external repository identity in the audit chain.',o:'shop-v42 deploys without a stored cloud credential.',s:{deploy:['accepted','release=shop-v42; actor=ci-shop-main; source=acme/shop@main'],runner:['complete','deployment dep-1902']}}
    ], 'Federation matches exact external issuer, audience, and subject before minting a short-lived token with no greater authority than the mapped workload.', 0);

  add(identityChapter, 'mTLS', 'trust',
    'A settlement client and ledger server authenticate each other before exchanging bank instructions.',
    [['client','Settlement Client','SPIFFE caller'],['clientCert','Client SVID','spiffe://bank/settlement'],['server','Ledger API','Mutual TLS server'],['serverCert','Ledger SVID','spiffe://bank/ledger'],['ca','Bank Trust Bundle','Root and intermediate CAs']],
    [['ca','clientCert','Issue client certificate'],['ca','serverCert','Issue server certificate'],['client','server','TLS 1.3 handshake'],['clientCert','server','Client proof'],['serverCert','client','Server proof']],
    [
      {t:'Load short-lived identities',a:['ca','clientCert','Issue serial C81; TTL=30m'],n:'The CA issues distinct certificates whose SANs name settlement and ledger workloads.',o:'Neither workload shares a symmetric secret.',s:{clientCert:['ready','SAN=spiffe://bank/settlement; serial=C81'],serverCert:['ready','SAN=spiffe://bank/ledger; serial=S92'],ca:['trusted','root=bank-root-7; intermediate=bank-int-22']}},
      {t:'Verify the ledger server',a:['serverCert','client','Present chain and signature'],n:'The client validates chain, expiry, key usage, and exact ledger SPIFFE SAN before sending settlement bytes.',o:'The caller knows it reached the intended workload.',s:{client:['server verified','peer=spiffe://bank/ledger; TLS1.3'],server:['handshaking','cipher=TLS_AES_256_GCM_SHA384']}},
      {t:'Verify the settlement client',a:['clientCert','server','CertificateVerify proof'],n:'Ledger validates the client chain and exact settlement SPIFFE identity, not merely any certificate from the CA.',o:'The server has a cryptographic caller identity.',s:{server:['client verified','peer=spiffe://bank/settlement; serial=C81']}},
      {t:'Authorize after authentication',a:['client','server','POST /settlements/S-771'],n:'Ledger policy permits settlement to submit, but not approve, instruction S-771 for USD 12,000.',o:'Transport identity feeds least-privilege authorization.',s:{server:['accepted','action=submit; settlement=S-771; amount=USD12000'],client:['waiting','HTTP request encrypted; direction=bidirectional']}},
      {t:'Rotate the channel identity',a:['ca','clientCert','Renew as serial C82'],n:'The client opens new connections with C82 while existing C81 sessions drain before expiry.',o:'Certificate renewal avoids a fleet-wide reconnect cliff.',s:{clientCert:['rotated','serial=C82; C81 draining'],server:['complete','S-771 submitted; peer serial=C81']}}
    ], 'Both peers validate chain, lifetime, key usage, and exact workload SAN; mTLS authentication is followed by action authorization.', 1);

  add(identityChapter, 'RBAC', 'identity',
    'A production console grants operators role-defined actions while preventing a viewer from restarting a database.',
    [['alice','Alice Session','On-call operator principal'],['bob','Bob Session','Read-only principal'],['pdp','RBAC Evaluator','Role-permission decision point'],['roles','Role Directory','Principal-role assignments'],['db','Orders Database','Protected production resource']],
    [['alice','pdp','restart orders-db request'],['bob','pdp','restart orders-db request'],['roles','pdp','Role and permission lookup'],['pdp','db','Authorized administration']],
    [
      {t:'Load role assignments',a:['roles','pdp','Read assignments revision 72'],n:'Alice has prod-db-operator; Bob has prod-observer. The operator role includes db.restart, while observer includes db.read.',o:'Permissions are inherited through named roles.',s:{roles:['loaded','alice=prod-db-operator; bob=prod-observer; rev=72'],pdp:['ready','policy checksum=rbac-72aa']}},
      {t:'Evaluate Alice action',a:['alice','pdp','db.restart resource=orders-db'],n:'The evaluator matches Alice role prod-db-operator to db.restart and requires an incident ticket claim.',o:'Alice passes role and context prerequisites.',s:{alice:['requesting','action=db.restart; incident=ICM-771'],pdp:['allowed','principal=alice; role=prod-db-operator; permission=db.restart']}},
      {t:'Restart the database',a:['pdp','db','Execute controlled failover'],n:'The console restarts the read replica first and records actor, role, ticket, resource, and policy revision.',o:'The authorized operation completes audibly.',s:{db:['restarted','resource=orders-db/replica-2; actor=alice; ticket=ICM-771']}},
      {t:'Deny Bob action',a:['bob','pdp','db.restart resource=orders-db'],n:'Bob is authenticated, but prod-observer has no db.restart permission.',o:'The action is denied before reaching the database.',s:{bob:['denied','403; role=prod-observer; missing=db.restart'],pdp:['denied','principal=bob; decision=role lacks permission']}},
      {t:'Allow Bob read access',a:['bob','pdp','db.read resource=orders-db'],n:'The same role permits Bob to view replication lag and connection count.',o:'Bob retains useful least-privilege access.',s:{pdp:['allowed','principal=bob; permission=db.read'],db:['read only','lag=21ms; connections=84']}}
    ], 'Permissions come from reviewed role definitions, and every operation is denied unless the principal has an explicit role-to-action grant.', 2);

  add(identityChapter, 'ABAC', 'identity',
    'A clinical records API uses subject, resource, action, and environment attributes for emergency-aware access.',
    [['doctor','Dr. Chen Token','Clinician subject attributes'],['api','Records API','Policy enforcement point'],['pdp','Clinical ABAC Engine','Attribute decision point'],['record','Patient P-882 Record','Sensitivity-tagged resource'],['context','Hospital Context Feed','Shift and network attributes']],
    [['doctor','api','GET patient record'],['api','pdp','ABAC decision request'],['record','pdp','Resource attributes'],['context','pdp','Environment attributes'],['api','record','Authorized field read']],
    [
      {t:'Assemble subject attributes',a:['doctor','api','GET /patients/P-882'],n:'The token carries sub=E-204, profession=physician, department=cardiology, assurance=mfa.',o:'The enforcement point has authenticated subject attributes.',s:{doctor:['requesting','sub=E-204; dept=cardiology; assurance=mfa'],api:['context building','action=record.read; patient=P-882']}},
      {t:'Load resource attributes',a:['record','pdp','classification=restricted; careTeam=cardiology'],n:'The record labels P-882 as restricted and lists cardiology as the active care team.',o:'Policy sees resource sensitivity and ownership.',s:{record:['described','patient=P-882; class=restricted; careTeam=cardiology'],pdp:['partial','subject and resource loaded']}},
      {t:'Add environment attributes',a:['context','pdp','shift=active; network=clinical'],n:'The context feed attests that E-204 is on shift, inside the clinical network, at 13:03 local time.',o:'Current environmental evidence is available.',s:{context:['attested','onShift=true; network=clinical; freshness=8s']}},
      {t:'Evaluate the expression',a:['pdp','api','Allow policy clinical-read-v19'],n:'Policy requires physician, matching care team, MFA, active shift, clinical network, and action record.read.',o:'All six predicates evaluate true.',s:{pdp:['allowed','policy=clinical-read-v19; predicates=6/6'],api:['authorized','fields=diagnosis,medications; excludes psychotherapy']}},
      {t:'Return a filtered view',a:['api','record','Read approved fields'],n:'The API returns only diagnosis and medications and logs the attributes and policy version used.',o:'Authorization adapts to subject, resource, and environment.',s:{record:['read','fields=diagnosis,medications; actor=E-204'],api:['complete','HTTP 200; decisionId=abac-771']}}
    ], 'Every allow decision is derived from fresh, authenticated attributes and an explicit action; missing or stale attributes deny by default.', 3);

  add(identityChapter, 'OBO', 'identity',
    'A dashboard calls a reports service on behalf of a signed-in user without forwarding the upstream token to the wrong audience.',
    [['user','Employee Browser','Delegating user'],['web','Dashboard API','Middle-tier confidential client'],['sts','Corporate STS','On-behalf-of exchanger'],['reports','Reports API','Downstream resource'],['audit','Delegation audit log','Actor-subject evidence store']],
    [['user','web','Token aud=dashboard-api'],['web','sts','OBO token exchange'],['sts','web','Token aud=reports-api'],['web','reports','Delegated report call'],['reports','audit','Delegation decision']],
    [
      {t:'Accept the upstream token',a:['user','web','GET /dashboard with token up-771'],n:'Dashboard validates iss=corporate, aud=dashboard-api, sub=E-204, azp=analytics-web, and reports.read scope.',o:'The middle tier establishes user and client context.',s:{user:['waiting','token jti=up-771; aud=dashboard-api'],web:['validated','sub=E-204; azp=analytics-web; scope=reports.read']}},
      {t:'Request downstream authority',a:['web','sts','OBO exchange assertion=up-771'],n:'Dashboard authenticates as client dashboard-api and asks for reports-api/.default while presenting the user assertion.',o:'The STS can evaluate the full delegation chain.',s:{sts:['evaluating','user=E-204; actor=dashboard-api; target=reports-api']}},
      {t:'Mint actor-bound token',a:['sts','web','Issue down-882'],n:'The STS issues aud=reports-api, sub=E-204, act.sub=dashboard-api, scope=reports.read, exp=13:08Z.',o:'The downstream token names both user and acting service.',s:{sts:['issued','jti=down-882; sub=E-204; act=dashboard-api'],web:['token held','aud=reports-api; ttl=300s']}},
      {t:'Call the downstream API',a:['web','reports','GET /quarterly with down-882'],n:'Reports rejects the original dashboard audience but accepts down-882 and checks the actor is allowed to delegate reports.read.',o:'The request is authorized for the right target.',s:{reports:['authorized','user=E-204; actor=dashboard-api; report=quarterly']}},
      {t:'Audit the delegation chain',a:['reports','audit','Append OBO decision'],n:'The event records user E-204, client analytics-web, actor dashboard-api, target reports-api, scope, and token IDs.',o:'Investigators can attribute both human and workload.',s:{audit:['persisted','up=up-771; down=down-882; allow; report=quarterly'],user:['complete','quarterly report returned']}}
    ], 'Each hop validates its own audience, and the downstream token preserves both delegated subject and acting workload with no privilege increase.', 0);

  add(identityChapter, 'Confused deputy', 'trust',
    'An image-conversion service must not use its storage privilege to fetch an attacker-selected object from another tenant.',
    [['attacker','Tenant Red Client','Untrusted requester'],['converter','Image Converter','Privileged deputy'],['authz','Conversion Policy','Intent and tenant binder'],['storage','Object Storage','Privileged resource'],['victim','Tenant Blue Object','blue/private/payroll.png']],
    [['attacker','converter','Convert object request'],['converter','authz','Authorize caller plus target'],['converter','storage','Scoped object read'],['storage','victim','Read tenant-blue object']],
    [
      {t:'Receive attacker-selected input',a:['attacker','converter','Convert blue/private/payroll.png'],n:'Tenant Red asks the converter to fetch a Tenant Blue path while presenting a valid conversion token for tenant-red.',o:'The converter recognizes a cross-tenant target.',s:{attacker:['requesting','callerTenant=red; targetTenant=blue'],converter:['untrusted input','object=blue/private/payroll.png']}},
      {t:'Bind caller intent to target',a:['converter','authz','Check tenant, object, and action'],n:'Policy requires token tenant_id to equal object owner and signed request target to equal the storage resource.',o:'The mismatched tenant fails authorization.',s:{authz:['denied','caller tenant=red; resource tenant=blue; policy=tenant-bind-v8']}},
      {t:'Prevent privileged read',a:null,n:'The converter does not use its broad storage identity after the policy denial, so Storage never receives a read for the victim path.',o:'The deputy cannot be tricked into exercising ambient authority.',s:{converter:['rejected','403 target_not_owned; no storage call'],storage:['untouched','reads for blue/private/payroll.png=0'],victim:['protected','checksum=sha256:91aa unchanged']}},
      {t:'Issue resource-bound authority',a:['authz','converter','Grant signed capability for red/uploads/cat.png'],n:'A valid request names tenant-red, exact object red/uploads/cat.png, conversion action, and five-minute expiry.',o:'The deputy receives narrow authority for one object.',s:{authz:['allowed','capability cap-881; object=red/uploads/cat.png'],converter:['authorized','callerTenant=red; targetTenant=red']}},
      {t:'Use only the bound capability',a:['converter','storage','GET red/uploads/cat.png with cap-881'],n:'Storage verifies the capability audience, object path, action, and expiry rather than trusting converter identity alone.',o:'The legitimate conversion completes without ambient cross-tenant access.',s:{storage:['read','red/uploads/cat.png; capability=cap-881'],converter:['complete','output=red/converted/cat.webp']}}
    ], 'The deputy binds caller identity, delegated action, tenant, and exact resource before exercising any privileged downstream credential.', 1);

  const traceChapter = 'observability-distributed-debugging';

  add(traceChapter, 'Distributed tracing', 'trace',
    'A slow checkout is reconstructed across gateway, orders, inventory, and payment spans with causal IDs and durations.',
    [['client','Checkout Client','Trace initiator'],['gateway','Checkout Gateway','Root server span'],['orders','Orders API','Order orchestration span'],['inventory','Inventory API','Stock child span'],['payment','Payment API','Charge child span'],['collector','Trace Backend','Causal trace store']],
    [['client','gateway','traceparent header'],['gateway','orders','Child context'],['orders','inventory','Child context'],['orders','payment','Child context'],['orders','collector','OTLP spans']],
    [
      {t:'Create the trace context',a:['client','gateway','traceparent 00-4bf92f...4736-00f067...02b7-01'],n:'The client starts trace 4bf92f3577b34da6a3ce929d0e0e4736 and parent span 00f067aa0ba902b7.',o:'One stable trace ID follows the checkout.',s:{client:['sent','trace=4bf92f...4736; span=00f067aa0ba902b7'],gateway:['span open','span=3a12; parent=00f067aa0ba902b7']}},
      {t:'Propagate to order creation',a:['gateway','orders','traceparent parent=3a12'],n:'Gateway creates a 6 ms span; Orders starts span 7b44 with parent 3a12.',o:'The service boundary preserves causality.',s:{gateway:['span closed','span=3a12; duration=6ms; status=OK'],orders:['span open','span=7b44; parent=3a12']}},
      {t:'Trace parallel dependencies',a:['orders','inventory','Reserve SKU-42; span=8c11'],n:'Inventory takes 21 ms while Payment span 9d22 starts in parallel for the same Orders parent.',o:'The trace represents concurrency rather than a flat correlation list.',s:{inventory:['span closed','span=8c11; parent=7b44; duration=21ms'],payment:['span open','span=9d22; parent=7b44']}},
      {t:'Locate the critical path',a:['orders','payment','Await charge ch-8821'],n:'Payment retries once and closes after 412 ms with status OK; Orders total is 438 ms.',o:'Payment, not Inventory, explains the latency.',s:{payment:['span closed','span=9d22; duration=412ms; retries=1'],orders:['span closed','span=7b44; duration=438ms; status=OK']}},
      {t:'Assemble the causal tree',a:['orders','collector','Export spans 3a12,7b44,8c11,9d22'],n:'The backend orders spans by parent IDs and marks Payment as 94 percent of the critical path.',o:'An operator can diagnose the slow dependency from one trace.',s:{collector:['indexed','trace=4bf92f...4736; spans=5; duration=444ms'],client:['complete','HTTP 201; total=447ms']}}
    ], 'Every remote hop propagates the same trace ID and creates a unique span ID with the actual parent, status, and duration.', 2);

  add(traceChapter, 'OpenTelemetry', 'trace',
    'A vendor-neutral telemetry pipeline correlates application spans, runtime metrics, and structured logs through one resource identity.',
    [['app','Orders Process','OTel-instrumented workload'],['sdk','In-process OTel pipeline','Context propagation and batch state'],['agent','OTel Collector Agent','Node receiver and processor'],['gateway','OTel Gateway','Central sampling and export'],['backend','Telemetry Backend','Trace, metric, and log store']],
    [['app','sdk','OTel API calls'],['sdk','agent','OTLP/gRPC batches'],['agent','gateway','Filtered OTLP'],['gateway','backend','Vendor exporter']],
    [
      {t:'Describe the resource',a:['app','sdk','Set service resource attributes'],n:'The in-process telemetry pipeline records service.name=orders-api, service.version=42.3, deployment.environment=prod, cloud.region=westus2.',o:'All three signals share one workload identity.',s:{app:['running','orders-api 42.3; pod=orders-7f9'],sdk:['configured','resource schema=https://opentelemetry.io/schemas/1.27.0']}},
      {t:'Create semantic spans',a:['app','sdk','Start HTTP and DB spans'],n:'An HTTP server span and db.system=postgresql child span use trace 70f5...91aa and semantic HTTP/database attributes.',o:'Instrumentation produces portable causal data.',s:{sdk:['batched','trace=70f5...91aa; spans=http 84ms, db 31ms']}},
      {t:'Correlate logs and metrics',a:['app','sdk','Emit error log and request counter'],n:'The error log carries trace_id=70f5...91aa and span_id=aa81; the in-process telemetry pipeline avoids trace IDs as metric labels.',o:'Detailed context and bounded-cardinality aggregates coexist.',s:{app:['emitted','log level=ERROR; orders.requests +1'],sdk:['queued','logs=1; metrics=1; exemplars=trace 70f5...91aa']}},
      {t:'Process near the source',a:['sdk','agent','Export OTLP batch 771'],n:'The agent redacts customer.email, adds k8s.namespace=checkout, and batches 512 records.',o:'Sensitive fields leave neither the node nor the approved schema.',s:{agent:['processed','batch=771; records=512; redacted=customer.email']}},
      {t:'Export through one gateway',a:['agent','gateway','Send compressed OTLP'],n:'The gateway applies sampling policy rev-19 and exports accepted telemetry to the backend with retry queue depth 0.',o:'Backend choice is isolated from application code.',s:{gateway:['exported','batch=771; policy=rev-19; accepted=512'],backend:['indexed','trace=70f5...91aa; service=orders-api'],app:['complete','request HTTP 500; telemetry linked']}}
    ], 'Telemetry uses stable semantic conventions, bounded attributes, propagated context, and a vendor-neutral OTLP boundary.', 3);

  add(traceChapter, 'Tail-based sampling', 'trace',
    'Collectors retain rare failures and slow traces after observing complete outcomes instead of deciding at request start.',
    [['api','Search API','Trace producer'],['shard','Search Shard 17','Late child-span producer'],['collectorA','Collector A','Trace fragment buffer'],['collectorB','Collector B','Trace owner'],['policy','Tail Policy','Outcome-based sampler'],['store','Trace Store','Retained traces']],
    [['api','collectorA','Root span fragment'],['shard','collectorB','Child span fragment'],['collectorA','collectorB','Trace-ID sharded fragment'],['collectorB','policy','Complete trace summary'],['policy','store','Sampled trace']],
    [
      {t:'Buffer the root fragment',a:['api','collectorA','Span a1 trace=8e2c...7710'],n:'Search API closes root span a1 at 920 ms, above the 500 ms latency threshold, but no decision is made yet.',o:'The collector retains provisional trace state.',s:{api:['span closed','trace=8e2c...7710; span=a1; duration=920ms'],collectorA:['buffering','trace fragments=1; age=0.1s']}},
      {t:'Receive a late child',a:['shard','collectorB','Span b7 status=ERROR'],n:'Shard 17 exports child b7 two seconds later with timeout=true and duration 801 ms.',o:'Failure evidence arrives after the root.',s:{shard:['span closed','span=b7; parent=a1; ERROR timeout; 801ms'],collectorB:['buffering','trace fragments=1; age=0s']}},
      {t:'Co-locate trace fragments',a:['collectorA','collectorB','Forward fragment by trace hash'],n:'Consistent hashing assigns trace 8e2c...7710 to Collector B, which now has root and child.',o:'One owner can evaluate the whole trace.',s:{collectorA:['forwarded','trace owner=collectorB; local fragments=0'],collectorB:['assembled','spans=2; root=920ms; error=true']}},
      {t:'Apply the tail policy',a:['collectorB','policy','Evaluate after 5s decision wait'],n:'Policy rev-31 keeps all errors, all traces over 500 ms, and 1 percent of remaining successes.',o:'This trace matches both error and slow predicates.',s:{policy:['sampled','reason=error+latency; rate=100% for match'],collectorB:['decision','keep trace=8e2c...7710']}},
      {t:'Persist the diagnostic trace',a:['policy','store','Write complete trace'],n:'The complete two-span trace is stored while an ordinary 82 ms success trace is discarded after the same wait.',o:'High-value evidence survives a constrained storage budget.',s:{store:['indexed','trace=8e2c...7710; spans=2; reason=error+latency'],collectorB:['evicted','buffer released after export']}}
    ], 'A tail decision occurs only after the configured completion wait, and all fragments for one trace converge on one decision owner.', 0);

  add(traceChapter, 'SLI / SLO / SLA', 'trace',
    'A checkout team separates measured availability, its engineering objective, and the contractual customer commitment.',
    [['traffic','Checkout Requests','Eligible user events'],['meter','SLI Calculator','Good-event evaluator'],['slo','SLO Window','Internal reliability target'],['budget','Error Budget','Release control'],['sla','Customer SLA','External commitment']],
    [['traffic','meter','Eligible request events'],['meter','slo','Good/valid ratio'],['slo','budget','Budget consumption'],['meter','sla','Contract measurement']],
    [
      {t:'Define eligible events',a:['traffic','meter','Count non-test checkout attempts'],n:'The SLI excludes synthetic probes and client-cancelled requests, counting a request good when status is non-5xx and latency is under 800 ms.',o:'The indicator maps to a user-visible checkout outcome.',s:{traffic:['window','30d total=12,000,000; excluded=41,220'],meter:['defined','good=status<500 AND duration<800ms']}},
      {t:'Compute the availability SLI',a:['meter','slo','Report 11,991,600 good of 12,000,000'],n:'The rolling 30-day SLI is 99.93 percent.',o:'A reproducible measurement feeds the objective.',s:{meter:['measured','good=11,991,600; valid=12,000,000; SLI=99.93%'],slo:['evaluating','target=99.90%; window=30d']}},
      {t:'Evaluate the SLO',a:['slo','budget','Compute remaining bad events'],n:'The 99.90 percent internal SLO permits 12,000 bad events; 8,400 have occurred, leaving 3,600.',o:'Thirty percent of the monthly error budget remains.',s:{slo:['met','actual=99.93%; target=99.90%'],budget:['remaining','3,600 events; 30%; burnRate=0.7x']}},
      {t:'Gate release risk',a:['budget','traffic','Allow canary with rollback guard'],n:'Because budget remains and burn is below 1x, v42 may canary; a 2x six-hour burn would freeze rollout.',o:'Reliability policy changes delivery behavior.',s:{budget:['release allowed','canary max=10%; freeze threshold=2x/6h'],traffic:['controlled','v42 exposure=1%']}},
      {t:'Distinguish the SLA',a:['meter','sla','Evaluate monthly contract at 99.5%'],n:'The external SLA promises 99.5 percent and service credits; it is looser than the 99.90 percent engineering SLO.',o:'The team can miss its SLO before breaching customer contracts.',s:{sla:['met','commitment=99.5%; actual=99.93%; credit=0%'],slo:['met with margin','0.03 percentage points above target']}}
    ], 'SLI math, SLO target/window, and SLA commitment are explicit and never treated as interchangeable terms.', 1);

  const migrationChapter = 'distributed-system-migration-patterns';

  add(migrationChapter, 'Strangler pattern', 'migration',
    'An insurance monolith yields quote traffic to a replacement service one capability and cohort at a time.',
    [['client','Broker Portal','Quote client'],['facade','Policy Facade','Capability switch'],['legacy','Policy Monolith v6','Legacy quote owner'],['newsvc','Quote Service v2','Replacement owner'],['compare','Result Comparator','Parity evaluator'],['db','Policy Database','System of record']],
    [['client','facade','POST /quotes'],['facade','legacy','Legacy quote path'],['facade','newsvc','Replacement quote path'],['newsvc','compare','v2 quote result'],['legacy','compare','v6 shadow result'],['legacy','db','Legacy policy data']],
    [
      {t:'Introduce the stable facade',a:['client','facade','POST /quotes under existing contract'],n:'The broker keeps the same API while the facade initially sends 100 percent of authoritative traffic to the monolith.',o:'Migration begins without client changes.',s:{facade:['active','legacy=100%; quote-v2=0%; rule rev1'],legacy:['authoritative','schema=quote.v1; rps=900']}},
      {t:'Shadow the replacement',a:['facade','newsvc','Mirror sanitized quote request'],n:'Quote v2 processes a side-effect-free copy and emits schema quote.v2; its response is not returned.',o:'Production-shaped behavior can be compared safely.',s:{newsvc:['shadow','rps=900; writes=false; schema=quote.v2'],facade:['authoritative legacy','shadow requestId=q-771']}},
      {t:'Reconcile business outputs',a:['legacy','compare','Compare premium and coverage'],n:'The comparator canonicalizes currency and finds 99.97 percent parity; 27 of 90,000 quotes differ due to rounding.',o:'A concrete incompatibility blocks promotion.',s:{compare:['mismatch','parity=99.97%; cause=rounding half-even vs half-up'],newsvc:['fix pending','build=2.4.18']}},
      {t:'Move one broker cohort',a:['facade','newsvc','Make broker B-17 authoritative'],n:'After the rounding fix, deterministic cohort B-17 moves 5 percent of quote traffic to v2 while fallback remains available.',o:'The new service owns a bounded cohort.',s:{facade:['split','legacy=95%; quote-v2=5%; cohort=B-17'],newsvc:['authoritative','rps=47; error=0.08%']}},
      {t:'Retire the quote capability',a:['facade','newsvc','Set quote-v2=100%'],n:'After 30 healthy days, the facade removes the monolith quote rule but leaves claims capabilities untouched.',o:'One bounded capability is strangled without a big-bang rewrite.',s:{facade:['active','quote-v2=100%; rule rev19'],legacy:['quote disabled','claims still active; quote rps=0'],db:['preserved','policy schema unchanged']}}
    ], 'At every stage exactly one path is authoritative for a request, and rollback preserves the external contract and stored data.', 2);

  add(migrationChapter, 'Dual writes', 'migration',
    'A customer-profile migration writes old and new stores while exposing partial failure for deterministic repair.',
    [['api','Profile API','Write coordinator'],['old','Customer SQL v3','Current authoritative store'],['new','Profile Document v4','Migration target'],['outbox','Repair Outbox','Durable missing-write log'],['repair','Repair Worker','Idempotent convergence'],['check','Reconciler','Checksum comparator']],
    [['api','old','Transaction write schema v3'],['api','new','Conditional write schema v4'],['api','outbox','Persist repair intent'],['outbox','repair','Retry missing target write'],['repair','new','Idempotent upsert'],['old','check','Source checksum'],['new','check','Target checksum']],
    [
      {t:'Canonicalize the intent',a:['api','old','Write customer C-771 version=18'],n:'The API computes canonical payload checksum sha256:7a91 and commits schema v3 version 18 to the authoritative SQL store.',o:'The source has one durable versioned update.',s:{api:['writing','customer=C-771; version=18; checksum=7a91'],old:['committed','C-771 v18; schema=v3; checksum=7a91']}},
      {t:'Attempt the target write',a:['api','new','PUT C-771 if version<18'],n:'The v4 document write times out after 200 ms, leaving its outcome unknown.',o:'The coordinator treats target state as uncertain, not successful.',s:{new:['unknown','C-771 write timeout; observed v17'],api:['partial failure','source=v18 committed; target confirmation absent']}},
      {t:'Persist repair evidence',a:['api','outbox','Append repair C-771/v18'],n:'The repair record includes source version, target schema v4, checksum 7a91, and operation ID prof-881.',o:'The divergence is durable and observable.',s:{outbox:['pending','op=prof-881; C-771 v18; checksum=7a91'],api:['accepted','202 migration_pending; source remains authoritative']}},
      {t:'Repair idempotently',a:['repair','new','Upsert C-771 version 18'],n:'The worker reads the source, transforms v3 to v4, and conditionally upserts only when target version is below 18.',o:'A retry cannot overwrite a newer target value.',s:{repair:['applied','op=prof-881; attempts=2'],new:['committed','C-771 v18; schema=v4; checksum=7a91'],outbox:['completed','op=prof-881']}},
      {t:'Verify convergence',a:['new','check','Compare C-771 checksums'],n:'The reconciler compares normalized fields and checksum 7a91 at version 18 in both stores.',o:'The repaired record is proven equivalent.',s:{check:['matched','C-771 v18; source=7a91; target=7a91'],old:['authoritative','C-771 v18'],new:['shadow-ready','C-771 v18']}}
    ], 'Partial success is recorded durably, repair is version-guarded and idempotent, and one store remains explicitly authoritative during migration.', 3);

  add(migrationChapter, 'CDC migration', 'migration',
    'A catalog database is copied and then kept current from its transaction log before read cutover.',
    [['source','Catalog PostgreSQL','Authoritative schema v7'],['snapshot','Snapshot Copier','Consistent backfill'],['log','WAL Slot catalog_mig','Ordered change stream'],['apply','CDC Applier','Target transformer'],['target','Catalog Store v8','Migration target'],['check','Migration Verifier','LSN and checksum judge']],
    [['source','snapshot','Repeatable-read snapshot'],['source','log','WAL changes after LSN'],['snapshot','target','Historical rows v7->v8'],['log','apply','Ordered insert/update/delete'],['apply','target','Idempotent target mutations'],['target','check','Counts and checksums']],
    [
      {t:'Fence a consistent snapshot',a:['source','snapshot','Begin snapshot at LSN 0/7A91'],n:'The copier starts a repeatable-read snapshot at schema v7 and records WAL start LSN 0/7A91 before scanning.',o:'Backfill and live changes share a precise boundary.',s:{source:['snapshot open','schema=v7; startLSN=0/7A91'],snapshot:['copying','partition=products/00; rows=0']}},
      {t:'Copy historical partitions',a:['snapshot','target','Write transformed schema v8 batches'],n:'The copier moves 4.2 million products in 10,000-row batches and transforms price_cents into money_minor plus currency.',o:'The target receives a deterministic historical image.',s:{snapshot:['complete','rows=4,200,000; lastKey=SKU-999999; checksum=11bc'],target:['backfilled','schema=v8; rows=4,200,000; writes gated']}},
      {t:'Capture concurrent commits',a:['source','log','Stream WAL after 0/7A91'],n:'While the copy runs, WAL records update SKU-42 at LSN 0/7B10 and delete SKU-19 at 0/7B22 in commit order.',o:'Writes during backfill are not lost.',s:{log:['streaming','from=0/7A91; head=0/7C00; events=18,442'],source:['authoritative','currentLSN=0/7C00; schema=v7']}},
      {t:'Apply ordered changes',a:['log','apply','Apply through LSN 0/7C00'],n:'The applier preserves transaction boundaries, maps deletes to tombstones, and stores the last committed LSN with each batch.',o:'Replay resumes safely after failure.',s:{apply:['caught up','checkpointLSN=0/7C00; lag=0.4s'],target:['current','SKU-42 v81; SKU-19 tombstoned; schema=v8']}},
      {t:'Prove cutover readiness',a:['target','check','Compare counts and partition hashes'],n:'The verifier observes equal live-row count 4,199,998, matching normalized checksum 4f81, and CDC lag below one second for 30 minutes.',o:'Read traffic can move to v8 with measured evidence.',s:{check:['passed','rows=4,199,998; checksum=4f81; lagP99=0.7s'],target:['cutover ready','schema=v8; checkpoint=0/7C00']}}
    ], 'The snapshot boundary and CDC checkpoint are durable, source commit order is preserved, and cutover requires count, checksum, delete, and lag agreement.', 0);

  const dedupChapter = 'distributed-deduplication-idempotency';

  add(dedupChapter, 'Idempotency keys', 'dedup',
    'A payment API returns the original charge result when a client retries after losing the response.',
    [['client','Checkout Client','Retrying payment caller'],['api','Payments API','Idempotency coordinator'],['table','Idempotency Store','Key and result owner'],['processor','Card Processor','External charge system'],['ledger','Payment Ledger','Durable business outcome']],
    [['client','api','POST /charges with key'],['api','table','Claim tenant plus key'],['api','processor','Create card charge'],['api','ledger','Commit payment'],['table','client','Replay stored response']],
    [
      {t:'Claim the logical command',a:['client','api','POST /charges; key=pay-tenant7-881'],n:'The API hashes canonical payload amount=4900,currency=USD,order=O-90017 to sha256:a771.',o:'Retries can be distinguished from key misuse.',s:{client:['sent','key=pay-tenant7-881; attempt=1'],api:['canonicalized','fingerprint=a771; tenant=7']}},
      {t:'Create the unique key row',a:['api','table','INSERT tenant7/key881 status=processing'],n:'A unique constraint on tenant and key elects this request as owner and stores fingerprint a771.',o:'Only one request may perform the side effect.',s:{table:['processing','tenant=7; key=881; fingerprint=a771; owner=req-71'],api:['owner','request=req-71']}},
      {t:'Commit the external charge',a:['api','processor','Charge card token pm-92'],n:'The processor creates charge ch_8821 once using the same idempotency key.',o:'The external side effect has a stable identity.',s:{processor:['charged','ch_8821; USD49.00; idempotency=pay-tenant7-881'],ledger:['pending','order=O-90017']}},
      {t:'Store the authoritative response',a:['api','ledger','Commit payment P-771'],n:'The ledger and idempotency result record commit status 201, charge ch_8821, and response checksum 3c91 before reply.',o:'The replay result is durable.',s:{ledger:['committed','payment=P-771; charge=ch_8821; USD49.00'],table:['completed','HTTP 201; responseChecksum=3c91; expires=24h']}},
      {t:'Replay after response loss',a:['client','api','Retry same key and fingerprint'],n:'Attempt two finds the completed row, verifies fingerprint a771, and returns the original 201 body without contacting the processor.',o:'One logical command produces one charge.',s:{client:['complete','attempt=2; HTTP 201; charge=ch_8821'],api:['replayed','processorCalls=0; result checksum=3c91'],processor:['unchanged','charges for key=1']}}
    ], 'The key is scoped, payload-bound, durably claimed before side effects, and completed with the exact response returned to every retry.', 1);

  add(dedupChapter, 'Deduplication tables', 'dedup',
    'An email consumer handles at-least-once order events while sending one receipt per event identity.',
    [['broker','Orders Topic','At-least-once event source'],['consumer','Receipt Consumer','Event handler'],['dedup','Processed Events Table','Unique event ledger'],['email','Email Provider','Receipt side effect'],['outbox','Email Outbox','Transactional send intent']],
    [['broker','consumer','order.paid event'],['consumer','dedup','Unique event claim'],['consumer','outbox','Receipt intent'],['outbox','email','Provider send with event ID']],
    [
      {t:'Deliver the first event',a:['broker','consumer','event evt-771 delivery=1'],n:'The broker delivers order.paid event evt-771 for order O-90017 with payload checksum sha256:4aa1.',o:'The consumer has a stable producer-assigned identity.',s:{broker:['delivered','evt-771; partition=12; offset=991; attempt=1'],consumer:['received','eventId=evt-771; checksum=4aa1']}},
      {t:'Claim with a unique insert',a:['consumer','dedup','INSERT consumer=receipt,event=evt-771'],n:'The unique primary key (consumer_name,event_id) succeeds and records processing plus checksum 4aa1.',o:'This handler owns first processing.',s:{dedup:['processing','receipt/evt-771; checksum=4aa1; started=13:03:50Z']}},
      {t:'Commit intent with completion',a:['consumer','outbox','Insert receipt email for evt-771'],n:'One database transaction inserts outbox row mail-882 and marks dedup row completed.',o:'A crash cannot lose the send intent after marking complete.',s:{outbox:['pending','mail-882; event=evt-771; to=user1042'],dedup:['completed','receipt/evt-771; outcome=mail-882']}},
      {t:'Send with stable identity',a:['outbox','email','Send provider key=evt-771'],n:'The dispatcher sends the receipt and the provider records message em-992 under event key evt-771.',o:'Provider retries also collapse to one email.',s:{email:['sent','message=em-992; providerKey=evt-771'],outbox:['sent','mail-882; providerMessage=em-992']}},
      {t:'Discard duplicate delivery',a:['broker','consumer','event evt-771 delivery=2'],n:'The second unique insert conflicts; checksum matches, so the consumer acknowledges offset 991 without recreating the outbox row.',o:'Duplicate delivery has no duplicate business effect.',s:{consumer:['deduplicated','evt-771; existing outcome=mail-882'],dedup:['unchanged','one row receipt/evt-771'],email:['unchanged','messages for evt-771=1']}}
    ], 'The deduplication claim and durable side-effect intent commit atomically, with uniqueness scoped to consumer and stable event ID.', 2);

  add('time-based-distributed-patterns', 'Leases', 'dedup',
    'Two schedulers contend for a partition lease while fencing tokens prevent an expired owner from writing.',
    [['workerA','Scheduler A','Initial lease owner'],['workerB','Scheduler B','Failover contender'],['lease','Lease Store','Expiry and epoch authority'],['clock','Time Authority','Bounded server time'],['target','Job Partition 12','Fenced mutable resource']],
    [['workerA','lease','Acquire and renew'],['workerB','lease','Acquire after expiry'],['clock','lease','Authoritative expiry time'],['workerA','target','Write with fencing epoch'],['workerB','target','Write with fencing epoch']],
    [
      {t:'Acquire a bounded lease',a:['workerA','lease','Acquire partition12 for 30s'],n:'Lease Store grants Scheduler A epoch 81 until server time 13:04:15Z.',o:'A has temporary ownership plus a monotonic fence.',s:{workerA:['owner','partition=12; epoch=81; renewBy=13:04:05Z'],lease:['granted','owner=A; epoch=81; expires=13:04:15Z'],clock:['current','13:03:45Z; maxSkew=250ms']}},
      {t:'Write with the fence',a:['workerA','target','Checkpoint offset 991 with epoch 81'],n:'Partition 12 accepts epoch 81 because it is not below the highest observed epoch.',o:'Lease belief is enforced at the resource.',s:{target:['accepted','highestEpoch=81; checkpoint=991'],workerA:['working','batch=72; pause=0ms']}},
      {t:'Miss renewal during a pause',a:['workerA','lease','Renew arrives after expiry'],n:'A 42-second process pause causes renewal after 13:04:15Z, so the store rejects epoch 81.',o:'A no longer owns the lease even if its local clock disagrees.',s:{workerA:['expired','renew rejected; local belief stale'],lease:['available','epoch=81 expired at server time']}},
      {t:'Grant a higher epoch',a:['workerB','lease','Acquire partition12'],n:'Scheduler B acquires the expired lease and receives epoch 82 until 13:04:48Z.',o:'Ownership moves with a monotonic token.',s:{workerB:['owner','partition=12; epoch=82'],lease:['granted','owner=B; epoch=82; expires=13:04:48Z']}},
      {t:'Fence the stale owner',a:['workerA','target','Late checkpoint 1002 with epoch 81'],n:'Partition 12 rejects A because 81 is below highest epoch 82, then accepts B checkpoint 1001.',o:'Overlapping beliefs cannot create stale writes.',s:{target:['protected','reject epoch81; accept epoch82; checkpoint=1001'],workerA:['stopped','fenced; must reacquire'],workerB:['working','partition=12; checkpoint=1001']}}
    ], 'Lease expiry is decided by the lease authority, and every protected write carries a monotonic fencing token checked by the resource.', 3);

  const connectionChapter = 'realtime-connections';

  add(connectionChapter, 'Long polling', 'connection',
    'A job client receives near-real-time status using bounded HTTP requests that reconnect after events or timeout.',
    [['client','Job Browser','Polling HTTP client'],['gateway','Jobs Gateway','Connection and timeout owner'],['waiter','Job Wait Registry','Pending request index'],['worker','Render Worker','Status producer'],['store','Job Status Store','Versioned status owner']],
    [['client','gateway','GET status?afterVersion'],['gateway','waiter','Register pending request'],['worker','store','Commit job status'],['store','waiter','Wake matching request'],['gateway','client','HTTP response then reconnect']],
    [
      {t:'Open a bounded poll',a:['client','gateway','GET /jobs/J-77?after=12'],n:'The browser opens request lp-881 with a 25-second server wait and 30-second client timeout.',o:'One ordinary HTTP request represents the wait.',s:{client:['connected outbound','request=lp-881; afterVersion=12; timeout=30s'],gateway:['held inbound','request=lp-881; deadline=13:04:10Z']}},
      {t:'Register event interest',a:['gateway','waiter','Wait J-77 version>12'],n:'The gateway indexes request lp-881 by job and minimum version without dedicating a worker thread.',o:'A status commit can find the waiting request.',s:{waiter:['waiting','J-77 -> lp-881; minVersion=13; expires=25s']}},
      {t:'Commit a new version',a:['worker','store','Set J-77 progress=60% version=13'],n:'The render worker atomically advances job J-77 from version 12 to 13.',o:'The durable status changes before clients are notified.',s:{worker:['published','job=J-77; progress=60%; version=13'],store:['current','J-77 v13; state=rendering; progress=60%']}},
      {t:'Complete the held response',a:['store','waiter','Wake J-77 waiters for version 13'],n:'The waiter wakes lp-881; gateway returns HTTP 200 with ETag v13 and closes the response.',o:'The client receives the change once per poll.',s:{waiter:['released','lp-881; reason=version13'],gateway:['response closed','HTTP 200; connection duration=8.2s'],client:['received','J-77 v13; progress=60%']}},
      {t:'Reconnect from the checkpoint',a:['client','gateway','GET /jobs/J-77?after=13'],n:'The browser immediately opens a new request using last seen version 13; a timeout would return 204 and trigger the same reconnect.',o:'No update gap exists between polls.',s:{client:['connected outbound','request=lp-882; afterVersion=13'],gateway:['held inbound','request=lp-882; deadline=13:04:18Z'],store:['unchanged','J-77 v13']}}
    ], 'Every poll has a finite server deadline and resumes from a version checkpoint so reconnects neither miss nor invent status changes.', 0);

  add(connectionChapter, 'Server-Sent Events (SSE)', 'connection',
    'A browser receives one-way order updates over a resumable UTF-8 event stream.',
    [['browser','Order Browser','SSE client'],['edge','Streaming Edge','HTTP response proxy'],['hub','Order Event Hub','Subscriber and replay owner'],['orders','Orders Service','Event producer'],['log','Order Event Log','Monotonic event history']],
    [['browser','edge','GET text/event-stream'],['edge','hub','Streaming subscription'],['orders','log','Append order events'],['log','hub','Replay by event ID'],['hub','browser','One-way SSE frames']],
    [
      {t:'Open the event stream',a:['browser','edge','GET /orders/O-90017/events'],n:'The browser sends Accept: text/event-stream; the edge disables response buffering and keeps HTTP/2 direction server-to-client.',o:'A long-lived one-way stream is established.',s:{browser:['connected inbound','SSE readyState=OPEN; lastEventId=104'],edge:['streaming','content-type=text/event-stream; buffering=off']}},
      {t:'Resume from an event ID',a:['edge','hub','Subscribe O-90017 after=104'],n:'The hub uses Last-Event-ID 104 to replay only later events from the durable log.',o:'Reconnect semantics are explicit.',s:{hub:['subscribed','order=O-90017; after=104; subscribers=1'],log:['available','events 101..106; retention=24h']}},
      {t:'Publish an order transition',a:['orders','log','Append event id=105 shipped'],n:'Orders commits event 105 with type order.shipped and payload carrier=NX before fan-out.',o:'The event is replayable before delivery.',s:{orders:['published','O-90017 shipped; event=105'],log:['committed','id=105; checksum=71aa; position=8821']}},
      {t:'Send an SSE frame',a:['hub','browser','id:105 event:order.shipped'],n:'The hub emits id, event, and JSON data lines followed by a blank line; the browser updates tracking state.',o:'The browser advances its resume checkpoint to 105.',s:{hub:['sent','subscriber=browser; event=105; queueDepth=0'],browser:['received','lastEventId=105; state=shipped; direction=server->client']}},
      {t:'Reconnect after edge loss',a:['browser','edge','GET with Last-Event-ID:105'],n:'After a proxy restart, the browser reconnects automatically; heartbeat comments keep idle intermediaries open and event 106 replays.',o:'The stream recovers without duplicating state changes.',s:{edge:['reconnected','new HTTP/2 stream=19'],browser:['received','event=106 delivered; lastEventId=106'],hub:['healthy','replay count=1; heartbeat=15s']}}
    ], 'Events are durably ordered before fan-out, carry resumable IDs, and flow only server-to-client over a bounded replay window.', 1);

  add(connectionChapter, 'WebSockets', 'connection',
    'A collaborative editor maintains a full-duplex session with explicit ownership, sequencing, backpressure, and resume.',
    [['browser','Editor Browser','Bidirectional WebSocket peer'],['edge','WebSocket Edge','Upgrade and connection owner'],['session','Session Directory','Document-to-node mapping'],['room','Document Room 42','Ordered collaboration owner'],['peer','Peer Editor','Second WebSocket peer'],['log','Operation Log','Durable sequence history']],
    [['browser','edge','HTTP Upgrade to WebSocket'],['edge','session','Register connection owner'],['edge','room','Client frames'],['peer','room','Concurrent client frames'],['room','log','Append ordered operations'],['room','browser','Broadcast server frames']],
    [
      {t:'Upgrade the HTTP connection',a:['browser','edge','Upgrade: websocket; Sec-WebSocket-Protocol=collab.v2'],n:'The edge authenticates the session, negotiates collab.v2, and returns 101 Switching Protocols.',o:'One persistent full-duplex connection ws-771 is established.',s:{browser:['OPEN bidirectional','connection=ws-771; protocol=collab.v2'],edge:['owned','ws-771 -> node edge-7; sendQueue=0']}},
      {t:'Register connection ownership',a:['edge','session','Map doc42/user1042 to edge-7'],n:'The directory records a 30-second renewable presence lease and last acknowledged sequence 881.',o:'Fan-out can locate the current connection owner.',s:{session:['registered','doc42/user1042=edge-7/ws-771; ack=881'],room:['joined','doc=42; members=2; nextSeq=882']}},
      {t:'Accept a client operation',a:['browser','room','frame op-91 insert at position 18'],n:'The browser sends clientSeq=91 and baseServerSeq=881; Room 42 validates and assigns serverSeq=882.',o:'A globally ordered operation is created.',s:{browser:['sent','clientSeq=91; unacked=1'],room:['ordered','op=op-91; serverSeq=882; author=user1042']}},
      {t:'Persist then broadcast',a:['room','log','Append serverSeq=882 checksum=8a31'],n:'After the operation log commits, the room broadcasts sequence 882 to both WebSocket peers.',o:'Reconnect can replay the same authoritative order.',s:{log:['committed','doc42 seq=882; checksum=8a31'],peer:['received inbound','seq=882; queue=0'],browser:['acknowledged','clientSeq=91; serverSeq=882']}},
      {t:'Apply backpressure and resume',a:['room','browser','Pause after sendQueue reaches 1 MiB'],n:'The edge closes a persistently slow connection with code 1013; the browser reconnects using lastServerSeq=882 and receives later operations.',o:'One slow peer cannot exhaust room memory.',s:{edge:['recovered','old ws-771 closed 1013; new ws-772 OPEN'],browser:['resumed bidirectional','lastServerSeq=884; connection=ws-772'],room:['healthy','members=2; perConnectionLimit=1MiB']}}
    ], 'Operations are durably sequenced before broadcast, every connection has one owner and bounded queues, and resume starts from the last acknowledged server sequence.', 2);

  const advancedChapter = 'advanced-senior-staff-level-concepts';

  add(advancedChapter, 'Cell-based architecture', 'cells',
    'A SaaS platform maps tenants to self-contained compute and data cells so one cell failure has a bounded customer impact.',
    [['router','Global Tenant Router','Tenant-to-cell mapper'],['directory','Cell Directory','Versioned placement owner'],['cellA','Cell A', 'Tenants T001-T099 compute and data'],['cellB','Cell B','Tenants T100-T199 compute and data'],['tenant','Tenant T142','Cell B customer'],['ops','Cell Health Control','Isolation and evacuation']],
    [['tenant','router','Tenant-scoped request'],['router','directory','Resolve tenant placement'],['router','cellA','Cell A traffic'],['router','cellB','Cell B traffic'],['ops','cellB','Health and isolation control']],
    [
      {t:'Resolve tenant placement',a:['router','directory','Lookup tenant T142'],n:'Directory revision 812 maps T142 to cell-b with placement epoch 19.',o:'The request has one authoritative home cell.',s:{tenant:['requesting','tenant=T142; request=req-771'],directory:['resolved','T142 -> cell-b; epoch=19; rev=812'],router:['mapped','tenant=T142; destination=cell-b']}},
      {t:'Serve inside the cell',a:['router','cellB','Forward req-771 with placement epoch 19'],n:'Cell B uses its own API fleet, queue, cache, and database partition for T142; no Cell A dependency is on the path.',o:'Tenant state stays within one failure domain.',s:{cellB:['serving','tenant=T142; rps=41; dbShard=B7'],cellA:['isolated healthy','tenants=T001-T099; no T142 state']}},
      {t:'Detect cell-local failure',a:['ops','cellB','Trip isolation for database saturation'],n:'Cell B database saturation reaches 95 percent and error rate 8 percent; health control stops new tenant placements there.',o:'The fault is identified as cell-local.',s:{ops:['isolating','cell-b; reason=db saturation; newPlacement=false'],cellB:['degraded','tenants=100; error=8%; blastRadius=9.8%']}},
      {t:'Keep other cells healthy',a:['router','cellA','Serve tenant T041 normally'],n:'The router continues sending Cell A tenants to Cell A, whose database and queues are independent.',o:'About 90.2 percent of tenants remain unaffected across ten cells.',s:{cellA:['healthy','tenant=T041; error=0.1%; p95=91ms'],router:['partitioned','cell-b requests fail fast; other cells normal']}},
      {t:'Move one tenant safely',a:['directory','router','Update T142 -> cell-c epoch 20'],n:'After state replication and checksum 7a81 match, placement epoch 20 moves T142 to healthy Cell C; stale epoch 19 writes are fenced.',o:'Recovery changes placement without cross-cell split brain.',s:{directory:['updated','T142 -> cell-c; epoch=20; checksum=7a81'],tenant:['recovered','home=cell-c; HTTP 200'],cellB:['contained','T142 writes fenced; remediation continues']}}
    ], 'Each tenant has one versioned home cell, cells own complete serving dependencies, and placement epochs fence stale writes during movement.', 3);

  add(advancedChapter, 'Shuffle sharding', 'cells',
    'A queue service assigns each tenant a small worker subset so one noisy tenant cannot consume the whole fleet.',
    [['tenantA','Tenant A Producer','Noisy workload'],['tenantB','Tenant B Producer','Normal workload'],['mapper','Shard Mapper','Deterministic subset selector'],['workers1','Workers 1,4,7','Tenant A three-of-twelve shard'],['workers2','Workers 2,7,11','Tenant B three-of-twelve shard'],['metrics','Isolation Monitor','Overlap and saturation observer']],
    [['tenantA','mapper','Resolve tenant A subset'],['tenantB','mapper','Resolve tenant B subset'],['mapper','workers1','A jobs only to 1,4,7'],['mapper','workers2','B jobs only to 2,7,11'],['workers1','metrics','Subset utilization'],['workers2','metrics','Subset utilization']],
    [
      {t:'Compute Tenant A shard',a:['tenantA','mapper','Hash tenant=A, epoch=12'],n:'Rendezvous scoring selects workers 1, 4, and 7 from a twelve-worker fleet.',o:'Tenant A has three deterministic execution choices.',s:{mapper:['mapped','A -> [1,4,7]; epoch=12'],tenantA:['producing','rate=40 jobs/s; subsetSize=3']}},
      {t:'Compute Tenant B shard',a:['tenantB','mapper','Hash tenant=B, epoch=12'],n:'Tenant B maps to workers 2, 7, and 11, sharing only worker 7 with A.',o:'The tenants do not share the entire fleet.',s:{mapper:['mapped','A=[1,4,7]; B=[2,7,11]'],tenantB:['producing','rate=8 jobs/s; subsetSize=3']}},
      {t:'Constrain a noisy neighbor',a:['mapper','workers1','Dispatch A burst at 600 jobs/s'],n:'Tenant A saturates workers 1, 4, and 7; per-tenant queues and concurrency caps reject excess A work.',o:'At most three workers absorb A overload.',s:{workers1:['saturated','workers1,4,7; A queue=10k; rejected=12%'],metrics:['alerting','A subset saturation=100%; estimated fleet blast=25%']}},
      {t:'Preserve most Tenant B capacity',a:['mapper','workers2','Dispatch B at 8 jobs/s'],n:'B loses capacity on shared worker 7 but continues on workers 2 and 11.',o:'Tenant B retains two-thirds of its assigned shard.',s:{workers2:['degraded safe','worker7 busy; workers2,11 healthy; B p95=120ms'],tenantB:['served','success=99.8%; normal p95=90ms']}},
      {t:'Rebalance with an epoch',a:['mapper','workers1','Move A to [3,6,9] at epoch 13'],n:'The mapper stages a new subset and drains old assignments using job ownership epoch 13.',o:'A recovers without globally reshuffling every tenant.',s:{mapper:['updated','A=[3,6,9] epoch=13; B unchanged epoch=12'],workers1:['draining','old A jobs fenced by epoch'],metrics:['recovered','A blast radius remains 3/12 workers']}}
    ], 'Each tenant maps deterministically to a small bounded subset, and assignment epochs prevent old and new worker sets from processing the same job.', 0);

  add(advancedChapter, 'Multi-region active-active', 'cells',
    'Two regions accept shopping-cart writes while converging concurrent updates with explicit conflict semantics.',
    [['client','Global Shopper','Region-local writer'],['east','East US Cart Cell','Active writer region'],['west','West Europe Cart Cell','Active writer region'],['replicator','Cross-Region Log','Bidirectional change stream'],['resolver','Cart CRDT Resolver','Conflict merge authority'],['directory','Global Traffic Director','Healthy-region selector']],
    [['client','directory','Region selection'],['directory','east','East-local request'],['directory','west','West-local request'],['east','replicator','East change stream'],['west','replicator','West change stream'],['replicator','resolver','Concurrent cart operations']],
    [
      {t:'Serve the nearest active region',a:['directory','east','Send shopper S-77 to East US'],n:'The director chooses East US at 31 ms RTT while both regions are writable and healthy.',o:'The shopper gets region-local latency.',s:{directory:['selected','shopper=S-77 -> east; health east=green west=green'],client:['connected','homeHint=east; cart=C-881']}},
      {t:'Commit an east operation',a:['client','east','Add SKU-42 op=e81'],n:'East appends an add operation with dot east:81 and vector {east:81,west:19} before acknowledging.',o:'A durable causally tagged write exists in East.',s:{east:['committed','cart=C-881 add SKU-42; dot=east:81'],replicator:['queued','east:81 -> west; lag=120ms']}},
      {t:'Accept a concurrent west operation',a:['client','west','Set SKU-19 qty=2 op=w20'],n:'After mobile roaming, West accepts dot west:20 with vector {east:80,west:20}, concurrent with east:81.',o:'Both active regions remain available during network delay.',s:{west:['committed','cart=C-881 SKU-19 qty=2; dot=west:20'],replicator:['partitioned','east<->west lag=18s; two concurrent dots']}},
      {t:'Merge domain operations',a:['replicator','resolver','Merge e81 and w20'],n:'The resolver uses an observed-remove map: independent SKU operations merge, while per-SKU quantity uses the highest causal dot.',o:'No whole-cart last-writer overwrite loses an item.',s:{resolver:['merged','cart items={SKU-42:1,SKU-19:2}; vector={east:81,west:20}'],east:['converging','apply west:20'],west:['converging','apply east:81']}},
      {t:'Verify regional convergence',a:['resolver','replicator','Publish merged checksum 91bc'],n:'Both regions store vector {81,20} and canonical cart checksum 91bc; traffic remains active in both.',o:'The cart converges after the partition heals.',s:{east:['converged','checksum=91bc; vector=81,20'],west:['converged','checksum=91bc; vector=81,20'],client:['complete','cart has 2 SKUs; region=west']}}
    ], 'Every accepted write is durable in its local region, carries causal identity, and converges under a deterministic domain conflict rule.', 1);

  add(advancedChapter, 'Disaster recovery', 'cells',
    'A regional outage triggers a practiced recovery plan with explicit recovery time and recovery point objectives.',
    [['primary','West US Orders Region','Normal serving region'],['standby','Central US DR Region','Warm recovery region'],['backup','Geo-Replicated Backup','Encrypted durable copies'],['dns','Global DNS','Regional failover control'],['runbook','DR Orchestrator','Evidence-driven recovery'],['clients','Order Clients','Customer traffic']],
    [['primary','backup','Continuous log shipping'],['backup','standby','Restore data and config'],['runbook','dns','Fail over regional endpoint'],['dns','clients','Healthy region answer'],['clients','standby','Recovered order traffic']],
    [
      {t:'Declare recovery objectives',a:['primary','backup','Ship WAL every 30 seconds'],n:'Orders sets RPO=60 seconds and RTO=20 minutes; backups are encrypted, immutable for 14 days, and restored weekly.',o:'Recovery has measurable data-loss and time bounds.',s:{primary:['healthy baseline','region=westus; WAL=0/8A91'],backup:['current','lastLSN=0/8A88; lag=22s; restoreTest=pass']}},
      {t:'Detect regional loss',a:['runbook','primary','Confirm control and data plane failure'],n:'Three independent probes fail for five minutes and West US database quorum is unavailable.',o:'The runbook declares disaster at 13:03Z rather than reacting to one alarm.',s:{primary:['unavailable','region failure; lastAckLSN=0/8A91'],runbook:['declared','DR event dr-771; start=13:03Z; targetRTO=13:23Z']}},
      {t:'Restore the warm region',a:['backup','standby','Replay through LSN 0/8A88'],n:'Central US restores schema v42, policy checksum 7c11, secrets by reference, and WAL through the last replicated LSN.',o:'Recovered data is within the 60-second RPO.',s:{standby:['restored','schema=v42; LSN=0/8A88; checksum=81aa'],backup:['verified','data loss window=22s; within RPO']}},
      {t:'Promote and redirect traffic',a:['runbook','dns','Set orders.example -> centralus'],n:'After write fencing confirms West cannot rejoin as primary, Central US promotes at epoch 92 and DNS TTL is 30 seconds.',o:'New writes have one regional authority.',s:{standby:['primary','epoch=92; writes=true; health=green'],dns:['updated','centralus weight=100%; TTL=30s'],primary:['fenced','epoch=91 rejected']}},
      {t:'Measure recovered service',a:['clients','standby','Create order O-91001'],n:'The first successful order completes at 13:17Z, yielding RTO=14 minutes; reconciliation records 22 seconds of potential lost acknowledgements.',o:'Both RTO and RPO are measured against objectives.',s:{clients:['recovered','HTTP 201; order=O-91001; region=centralus'],runbook:['objectives met','RTO=14m<20m; RPO=22s<60s'],standby:['serving','error=0.2%; p95=210ms']}}
    ], 'Recovery promotes exactly one fenced write authority, restores verified data and configuration, and reports achieved RTO and RPO from observed timestamps.', 2);

  const allowedFamilies = new Set(['gateway', 'identity', 'trust', 'trace', 'migration', 'dedup', 'connection', 'cells']);
  Object.entries(lessons).forEach(([key, lesson]) => {
    if (!allowedFamilies.has(lesson.family)) throw new Error(`Invalid family for ${key}`);
    if (lesson.entities.length < 4 || lesson.entities.length > 9) throw new Error(`Invalid entity count for ${key}`);
    if (lesson.steps.length < 5 || lesson.steps.length > 8) throw new Error(`Invalid step count for ${key}`);
    const ids = new Set(lesson.entities.map(entity => entity[0]));
    lesson.steps.forEach((step, index) => {
      ids.forEach(id => {
        if (!step.states[id]) throw new Error(`Missing ${id} state in ${key} step ${index + 1}`);
      });
    });
  });

  window.SYSTEM_DESIGN_LESSONS = {
    ...(window.SYSTEM_DESIGN_LESSONS || {}),
    ...lessons
  };
}());
