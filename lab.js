const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const topicKey=document.body.dataset.topic;
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const code=(lines,active)=>lines.map((x,i)=>`<span class="line ${i===active?'active':''}">${esc(x)}</span>`).join('');
const B=(items,pointers={},active=[],done=[])=>({type:'boxes',items,pointers,active,done});
const C=(items,pointers={},active=[],done=[])=>({type:'chain',items,pointers,active,done});
const S=(items,active=-1)=>({type:'stack',items,active});
const H=(buckets,active=-1,done=[])=>({type:'hash',buckets,active,done});
const T=(nodes,edges,active='',done=[],activeEdge='')=>({type:'tree',nodes,edges,active,done,activeEdge});
const G=(cells,cols,active=[],done=[],frontier=[])=>({type:'grid',cells,cols,active,done,frontier});
const I=(bars,active=-1,done=[])=>({type:'intervals',bars,active,done});
const U=(groups,active='')=>({type:'groups',groups,active});
if(!$('#content'))document.body.insertAdjacentHTML('afterbegin',`
  <button class="control present" id="present">⛶ Presentation</button>
  <div class="progress"><i id="progress"></i></div>
  <div class="app">
    <aside class="sidebar">
      <div class="brand"><div class="logo" id="sideIcon"></div><div><b id="sideTitle"></b><small>Interview lab</small></div></div>
      <a class="back" href="index.html">← All data structures</a>
      <nav><a href="#start">01 · Mental model</a><a href="#visual">02 · Visual walkthrough</a><a href="#patterns">03 · Pattern map</a><a href="#templates">04 · C# templates</a><a href="#pitfalls">05 · Pitfalls</a><a href="#practice">06 · Practice</a></nav>
    </aside>
    <main id="content"></main>
  </div>`);

const topics={
arrays:{
  icon:'▦',title:'Arrays',tagline:'Contiguous memory turns index arithmetic into an algorithmic superpower.',chips:['O(1) indexing','Two pointers','Sliding window','Prefix sums','Binary search'],
  mental:[
    ['Addressable shelf','An array is a row of numbered slots. Jump to any slot in O(1), but inserting in the middle shifts everything.'],
    ['Move boundaries, not data','Many O(n²) pair/range searches become O(n) when sorted order or a window lets boundaries move monotonically.'],
    ['Precompute reusable work','Prefix/suffix arrays trade O(n) preparation for O(1) range answers.']
  ],
  visual:{name:'Two pointers: pair sum in a sorted array',code:['var left = 0;','var right = numbers.Length - 1;','while (left < right)','{','    var sum = numbers[left] + numbers[right];','    if (sum == target) return (left, right);','    if (sum < target) left++;','    else right--;','}'],frames:[
    [B([1,2,4,7,11,15],{L:0,R:5},[0,5]),4,'Start at both extremes. 1 + 15 = 16; target is 15. The sum is too large.'],
    [B([1,2,4,7,11,15],{L:0,R:4},[0,4]),7,'Move right leftward. 1 + 11 = 12; the sum is too small.'],
    [B([1,2,4,7,11,15],{L:1,R:4},[1,4]),6,'Move left rightward. 2 + 11 = 13; still too small.'],
    [B([1,2,4,7,11,15],{L:2,R:4},[2,4],[2,4]),5,'4 + 11 = 15. Return indices (2, 4). Each pointer only moved inward.']
  ]},
  patterns:[
    ['Sorted + pair/triple','Opposing two pointers','Discard an impossible side after each comparison.','O(n)'],
    ['Contiguous subarray','Sliding window','Expand right; shrink left when the invariant breaks.','O(n)'],
    ['Range sum / balance','Prefix sum + map','Convert a range query into a difference of prefixes.','O(n)'],
    ['Rotated/sorted answer','Binary search','Choose the half that can still contain the answer.','O(log n)'],
    ['Next arrangement','In-place index manipulation','Reverse/swap around a monotonic suffix.','O(n)'],
    ['Product except self','Prefix + suffix products','Accumulate left contribution, then right contribution.','O(n)'],
    ['Maximum subarray','Kadane','Best ending here either extends or restarts.','O(n)'],
    ['Many range updates','Difference array','Record boundary deltas, then prefix-sum once.','O(n+q)']
  ],
  templates:[
    ['Sliding window','var left = 0;\nfor (var right = 0; right < values.Length; right++)\n{\n    Add(values[right]);\n    while (!WindowIsValid()) Remove(values[left++]);\n    best = Math.Max(best, right - left + 1);\n}'],
    ['Binary search on answer','var lo = minimum; var hi = maximum;\nwhile (lo < hi)\n{\n    var mid = lo + (hi - lo) / 2;\n    if (CanAchieve(mid)) hi = mid;\n    else lo = mid + 1;\n}\nreturn lo;']
  ],
  pitfalls:['Off-by-one errors in inclusive versus exclusive windows.','Using int when sums/products require long.','Destroying input order without confirming mutation is allowed.','Applying sliding window when negative values break monotonicity.'],
  practice:['Explain why each pointer moves at most n times.','Derive the subarray sum formula prefix[r+1] − prefix[l].','Recognize when “minimum feasible X” enables binary search on the answer.']
},
strings:{
  icon:'Aa',title:'Strings',tagline:'Usually an array problem plus an alphabet, parsing rules, or symmetry.',chips:['Character counts','Windows','Palindromes','Parsing','String building'],
  mental:[['Immutable array','In C#, string updates allocate. Scan by index, use spans where appropriate, and build output with StringBuilder.'],['Window over requirements','Track what the current substring has versus what it needs; move the left edge only to restore/minimize.'],['Symmetry','Palindrome problems compare mirrored positions or expand around a center.']],
  visual:{name:'Minimum covering window',code:['var left = 0;','for (var right = 0; right < text.Length; right++)','{','    Add(text[right]);','    while (WindowCoversNeed())','    {','        RecordIfSmaller(left, right);','        Remove(text[left++]);','    }','}'],frames:[
    [B([...`ADOBECODEBANC`],{L:0,R:0},[0]),3,'Need A, B, C. Add A; the window is not complete.'],
    [B([...`ADOBECODEBANC`],{L:0,R:5},[0,1,2,3,4,5]),4,'At C, window “ADOBEC” covers all required characters.'],
    [B([...`ADOBECODEBANC`],{L:5,R:10},[5,6,7,8,9,10]),7,'Shrink, then expand. A later A and B allow the left boundary to advance.'],
    [B([...`ADOBECODEBANC`],{L:9,R:12},[9,10,11,12],[9,10,11,12]),6,'“BANC” is valid and smaller. Record it before removing B.']
  ]},
  patterns:[
    ['Anagram / permutation','Frequency map or fixed alphabet array','Equality of character multisets.','O(n)'],
    ['Longest/shortest substring','Sliding window','Maintain a valid character-count invariant.','O(n)'],
    ['Palindrome','Two pointers / center expansion','Compare mirrored characters.','O(n) or O(n²)'],
    ['Word segmentation','DP + trie/set','Prefix choices define subproblems.','O(n²)'],
    ['Decode / nested syntax','Stack or recursive parser','Opening tokens create context.','O(n)'],
    ['Many prefix queries','Trie','Share common prefixes across words.','O(total chars)'],
    ['Subsequence','Two pointers','Advance target pointer only on a match.','O(n)'],
    ['Repeated pattern matching','KMP / rolling hash','Reuse overlap instead of restarting.','O(n+m)']
  ],
  templates:[['Frequency window','var count = new Dictionary<char, int>();\nfor (var right = 0; right < s.Length; right++)\n{\n    count[s[right]] = count.GetValueOrDefault(s[right]) + 1;\n    while (HasTooMany(s[right]))\n        count[s[left++]]--;\n}'],['Expand palindrome','(int L, int R) Expand(string s, int l, int r)\n{\n    while (l >= 0 && r < s.Length && s[l] == s[r])\n    { l--; r++; }\n    return (l + 1, r - 1);\n}']],
  pitfalls:['Confusing Unicode chars with user-perceived graphemes.','Repeated concatenation causing quadratic allocation.','Forgetting duplicate required characters in a window.','Using a set where frequency counts are required.'],
  practice:['State the exact invariant for a no-repeat window.','Explain odd and even palindrome centers.','Choose between dictionary counts and a fixed-size int array.']
},
'linked-lists':{
  icon:'⛓',title:'Linked Lists',tagline:'Pointer rewiring without losing the rest of the chain.',chips:['Dummy head','Fast/slow','Reversal','Merge','Cycle'],
  mental:[['Train cars','A node only knows its next car. Before changing Next, save the remaining train.'],['Dummy sentinel','A fake node before the head removes special cases for inserting/removing the first real node.'],['Different speeds','Fast gains one node per step on slow; in a cycle it must eventually lap slow.']],
  visual:{name:'Reverse a singly linked list',code:['ListNode? previous = null;','var current = head;','while (current is not null)','{','    var next = current.Next;','    current.Next = previous;','    previous = current;','    current = next;','}','return previous;'],frames:[
    [C([1,2,3,4],{current:0},[0]),1,'previous is null; current points to the head.'],
    [C([1,2,3,4],{previous:0,current:1},[0,1],[0]),6,'Save node 2, reverse node 1, then advance both pointers.'],
    [C([1,2,3,4],{previous:1,current:2},[1,2],[0,1]),6,'The reversed prefix is 2 → 1; current starts the untouched suffix.'],
    [C([1,2,3,4],{previous:3},[3],[0,1,2,3]),9,'current is null. previous is the new head: 4 → 3 → 2 → 1.']
  ]},
  patterns:[
    ['Modify near head','Dummy sentinel','Uniform predecessor logic.','O(n)'],
    ['Reverse all or range','Three pointers','Preserve next before rewiring.','O(n)'],
    ['Cycle / middle','Fast and slow','Relative speed or 2:1 speed.','O(n), O(1)'],
    ['Merge sorted lists','Dummy + tail','Always append the smaller head.','O(n+m)'],
    ['Remove nth from end','Fixed pointer gap','Move fast n steps before slow.','O(n)'],
    ['Intersection','Switch heads','Both pointers traverse equal total length.','O(n+m)'],
    ['Palindrome','Middle + reverse half','Compare halves, optionally restore.','O(n)'],
    ['Copy random pointers','Map or interweaving','Preserve arbitrary cross-links.','O(n)']
  ],
  templates:[['Dummy-head removal','var dummy = new ListNode(0, head);\nvar current = dummy;\nwhile (current.Next is not null)\n{\n    if (ShouldRemove(current.Next))\n        current.Next = current.Next.Next;\n    else current = current.Next;\n}\nreturn dummy.Next;'],['Fast / slow','var slow = head;\nvar fast = head;\nwhile (fast?.Next is not null)\n{\n    slow = slow!.Next;\n    fast = fast.Next.Next;\n}']],
  pitfalls:['Losing the suffix before changing Next.','Dereferencing fast.Next without a null check.','Returning dummy instead of dummy.Next.','Creating accidental cycles during rewiring.'],
  practice:['Draw previous/current/next for one reversal iteration.','Prove why head-switching finds an intersection.','Use a dummy node to remove the first matching value.']
},
stacks:{
  icon:'▤',title:'Stacks',tagline:'Last-in, first-out memory for unfinished work.',chips:['LIFO','Parsing','Monotonic stack','DFS','Undo'],
  mental:[['Stack of plates','Only the newest unfinished item is accessible. Closing tokens resolve the most recent opening token.'],['Monotonic skyline','Pop elements that can no longer be the answer; survivors await a future resolver.'],['Implicit recursion','Every recursive call is a stack frame. An explicit stack gives control and avoids call-stack limits.']],
  visual:{name:'Monotonic stack: next greater element',code:['var stack = new Stack<int>();','for (var i = 0; i < values.Length; i++)','{','    while (stack.Count > 0 && values[stack.Peek()] < values[i])','    {','        var index = stack.Pop();','        answer[index] = values[i];','    }','    stack.Push(i);','}'],frames:[
    [S(['2'],0),9,'Read 2. No unresolved values exist, so push its index.'],
    [S(['2','1'],1),9,'Read 1. It cannot resolve 2, so it waits above 2.'],
    [S(['2'],0),5,'Read 5. Pop 1: its next greater value is 5.'],
    [S([], -1),5,'5 also resolves 2, so pop 2.'],
    [S(['5','3','6'],2),9,'Continue. Each index is pushed and popped at most once: O(n).']
  ]},
  patterns:[
    ['Balanced/nested tokens','Stack','Latest opener must close first.','O(n)'],
    ['Next greater/smaller','Monotonic stack','Pop while current resolves waiting items.','O(n)'],
    ['Histogram rectangle','Increasing stack','Popped height finds its maximal width.','O(n)'],
    ['Evaluate expression','Operand/operator stacks','Precedence determines reductions.','O(n)'],
    ['Decode nested string','Stack of prior contexts','Restore outer state at closing bracket.','O(n)'],
    ['Iterative DFS','Stack of vertices','Explicitly model recursive frontier.','O(V+E)'],
    ['Min stack','Parallel minima or encoded values','Store aggregate state per depth.','O(1)'],
    ['Remove adjacent conflicts','Stack as output buffer','Cancel against latest survivor.','O(n)']
  ],
  templates:[['Monotonic decreasing stack','var stack = new Stack<int>();\nfor (var i = 0; i < values.Length; i++)\n{\n    while (stack.Count > 0 && values[stack.Peek()] < values[i])\n        answer[stack.Pop()] = values[i];\n    stack.Push(i);\n}'],['Balanced delimiters','foreach (var ch in text)\n{\n    if (IsOpen(ch)) stack.Push(ch);\n    else if (stack.Count == 0 || !Matches(stack.Pop(), ch))\n        return false;\n}\nreturn stack.Count == 0;']],
  pitfalls:['Storing values when indices are needed for widths/distances.','Choosing increasing versus decreasing monotonic direction incorrectly.','Forgetting unresolved stack items need a default answer.','Confusing stack top with queue front.'],
  practice:['Explain why a monotonic-stack loop is O(n), not O(n²).','Derive histogram width when a bar is popped.','Convert a recursive DFS into an explicit stack.']
},
'queues-deques':{
  icon:'⇥',title:'Queues & Deques',tagline:'Process work in arrival order—or from both ends.',chips:['FIFO','BFS levels','Multi-source BFS','Monotonic deque','Scheduling'],
  mental:[['Checkout line','FIFO preserves distance layers: all distance-d nodes leave before distance-(d+1) nodes.'],['Many fires at once','Multi-source BFS enqueues every source initially, simulating simultaneous expansion.'],['Deque as candidate filter','For window extrema, remove expired indices from the front and dominated candidates from the back.']],
  visual:{name:'Monotonic deque: sliding-window maximum',code:['var deque = new LinkedList<int>();','for (var right = 0; right < values.Length; right++)','{','    while (deque.Count > 0 && deque.First!.Value <= right - k)','        deque.RemoveFirst();','    while (deque.Count > 0 && values[deque.Last!.Value] <= values[right])','        deque.RemoveLast();','    deque.AddLast(right);','    if (right >= k - 1) output.Add(values[deque.First!.Value]);','}'],frames:[
    [B([1,3,-1,-3,5,3,6,7],{R:0},[0]),8,'Add index 0. Deque stores candidates in decreasing value order.'],
    [B([1,3,-1,-3,5,3,6,7],{front:1,R:2},[0,1,2],[1]),6,'3 removes dominated 1; −1 waits behind 3. Window max is front = 3.'],
    [B([1,3,-1,-3,5,3,6,7],{front:4,R:4},[2,3,4],[4]),6,'5 removes every smaller candidate from the back.'],
    [B([1,3,-1,-3,5,3,6,7],{front:6,R:6},[4,5,6],[6]),9,'Front is always the current maximum; expired indices leave from the front.']
  ]},
  patterns:[
    ['Shortest unweighted steps','BFS queue','FIFO preserves increasing distance.','O(V+E)'],
    ['Spread from many sources','Multi-source BFS','Seed one queue with all sources.','O(V+E)'],
    ['Level-by-level tree','Queue + level size','Snapshot count before processing level.','O(n)'],
    ['Window maximum/minimum','Monotonic deque','Front is optimum; back removes dominated values.','O(n)'],
    ['Recent events','Queue with timestamps','Evict expired items from front.','O(n) total'],
    ['Round-robin work','Circular queue','Wrap indices modulo capacity.','O(1)'],
    ['0/1 weighted edges','0-1 BFS deque','Weight 0 goes front; weight 1 goes back.','O(V+E)'],
    ['Task scheduling','Queue + indegrees/cooldowns','Process currently available work.','varies']
  ],
  templates:[['BFS by level','var queue = new Queue<Node>();\nqueue.Enqueue(root);\nwhile (queue.Count > 0)\n{\n    var levelSize = queue.Count;\n    for (var i = 0; i < levelSize; i++)\n    {\n        var node = queue.Dequeue();\n        foreach (var next in node.Neighbors) queue.Enqueue(next);\n    }\n}'],['Monotonic deque','while (deque.Count > 0 && deque.First!.Value <= expired)\n    deque.RemoveFirst();\nwhile (deque.Count > 0 && values[deque.Last!.Value] <= current)\n    deque.RemoveLast();\ndeque.AddLast(index);']],
  pitfalls:['Marking BFS visited on dequeue instead of enqueue.','Mixing node count with queue.Count while mutating the queue.','Storing values rather than indices in a sliding-window deque.','Using List.RemoveAt(0), which is O(n), as a queue.'],
  practice:['Explain why BFS gives shortest edge count.','Initialize a multi-source BFS from all zero cells.','Trace which indices survive in a decreasing deque.']
},
'hash-tables':{
  icon:'#',title:'Hash Tables & Sets',tagline:'Trade memory for expected O(1) lookup and counting.',chips:['Membership','Frequency','Complement','Grouping','Memoization'],
  mental:[['Labeled drawers','A hash maps a key to a bucket; equality resolves exact identity. Average O(1), but not sorted.'],['Remember the past','Streaming scans store what has been seen so future elements can ask a constant-time question.'],['Canonical key','Group equivalent objects by transforming each into the same stable signature.']],
  visual:{name:'Two Sum: store the needed complement',code:['var seen = new Dictionary<int, int>();','for (var i = 0; i < numbers.Length; i++)','{','    var needed = target - numbers[i];','    if (seen.TryGetValue(needed, out var j))','        return (j, i);','    seen[numbers[i]] = i;','}'],frames:[
    [H([], -1),3,'At value 2, need 7. The map is empty, so no match.'],
    [H([['2','index 0']],0),6,'Store 2 → 0 for future values.'],
    [H([['2','index 0']],0),4,'At value 7, need 2. The map contains 2.'],
    [H([['2','index 0'],['7','index 1']],0,[0]),5,'Return indices (0,1). One pass replaced the O(n²) pair search.']
  ]},
  patterns:[
    ['Pair with target','Complement map','Ask whether the needed partner appeared.','O(n)'],
    ['Duplicates / membership','HashSet','Remember seen identities.','O(n)'],
    ['Frequency / majority','Dictionary counts','Aggregate by value.','O(n)'],
    ['Group equivalents','Canonical signature key','Sort/count characters or normalize form.','O(n·k)'],
    ['Prefix target','Prefix-sum frequency map','Need currentPrefix − target.','O(n)'],
    ['Longest consecutive','Set + sequence starts','Expand only where predecessor is absent.','O(n)'],
    ['Cache / repeated state','Memoization map','State key → previously computed result.','state count'],
    ['LRU cache','Map + doubly linked list','O(1) lookup plus O(1) recency updates.','O(1)']
  ],
  templates:[['Frequency map','var counts = new Dictionary<int, int>();\nforeach (var value in values)\n    counts[value] = counts.GetValueOrDefault(value) + 1;'],['Prefix-sum count','var frequency = new Dictionary<long, int> { [0] = 1 };\nlong prefix = 0;\nforeach (var value in values)\n{\n    prefix += value;\n    answer += frequency.GetValueOrDefault(prefix - target);\n    frequency[prefix] = frequency.GetValueOrDefault(prefix) + 1;\n}']],
  pitfalls:['Assuming dictionary iteration order is meaningful.','Using mutable objects as keys.','Forgetting counts when duplicates matter.','Checking after insertion in Two Sum and accidentally pairing an element with itself.'],
  practice:['Turn a nested “find matching partner” loop into a complement lookup.','Design a canonical key for anagrams.','Explain why longest-consecutive expansion remains O(n).']
},
'trees-bst':{
  icon:'♧',title:'Trees & Binary Search Trees',tagline:'Recursive structure: solve a node from the answers of its children.',chips:['DFS orders','BFS levels','BST invariant','LCA','Tree DP'],
  mental:[['Subproblem nesting','Every subtree is the same problem at a smaller root. Define exactly what a recursive call returns.'],['Traversal timing','Preorder acts before children, inorder between them, postorder after them. The action timing is the algorithm.'],['BST partitions space','Everything left is smaller; everything right is larger. Search discards half a path, not necessarily half the nodes.']],
  visual:{name:'Postorder height + diameter',code:['int Height(TreeNode? node)','{','    if (node is null) return 0;','    var left = Height(node.Left);','    var right = Height(node.Right);','    diameter = Math.Max(diameter, left + right);','    return 1 + Math.Max(left, right);','}'],frames:[
    [T([['A',340,45],['B',190,150],['C',490,150],['D',110,280],['E',270,280],['F',490,280]],[['A','B'],['A','C'],['B','D'],['B','E'],['C','F']],'D'),2,'Descend to a leaf. Null children return height 0.'],
    [T([['A',340,45],['B',190,150],['C',490,150],['D',110,280],['E',270,280],['F',490,280]],[['A','B'],['A','C'],['B','D'],['B','E'],['C','F']],'B',['D','E']),5,'Postorder combines D and E at B. Candidate diameter is leftHeight + rightHeight.'],
    [T([['A',340,45],['B',190,150],['C',490,150],['D',110,280],['E',270,280],['F',490,280]],[['A','B'],['A','C'],['B','D'],['B','E'],['C','F']],'C',['D','E','F']),6,'Each call returns one value upward: its height. Global diameter tracks the best path seen.'],
    [T([['A',340,45],['B',190,150],['C',490,150],['D',110,280],['E',270,280],['F',490,280]],[['A','B'],['A','C'],['B','D'],['B','E'],['C','F']],'A',['A','B','C','D','E','F']),5,'At A, left + right forms the longest path through the root.']
  ]},
  patterns:[
    ['Visit every node','DFS recursion or BFS','Choose order based on when work occurs.','O(n)'],
    ['Level / minimum depth','BFS','First matching level is shallowest.','O(n)'],
    ['Path aggregate','Carry state downward','Maintain sum/max/path along root-to-node path.','O(n)'],
    ['Height / diameter / balance','Postorder return value','Combine child summaries at parent.','O(n)'],
    ['Ancestor / split point','LCA recursion','Targets split into different subtrees.','O(n)'],
    ['BST search/range','Use ordering','Discard one branch from each node.','O(h)'],
    ['Serialize / rebuild','Traversal + null markers','Shape requires missing-child information.','O(n)'],
    ['Choose/skip nodes','Tree DP','Return states such as take versus skip.','O(n)']
  ],
  templates:[['Postorder combine','Result Dfs(TreeNode? node)\n{\n    if (node is null) return Result.Empty;\n    var left = Dfs(node.Left);\n    var right = Dfs(node.Right);\n    return Combine(node, left, right);\n}'],['BST search','var current = root;\nwhile (current is not null)\n{\n    if (target == current.Val) return current;\n    current = target < current.Val ? current.Left : current.Right;\n}\nreturn null;']],
  pitfalls:['Writing recursion before defining the return meaning.','Using global state that is not reset between calls.','Assuming a binary tree is balanced.','Using local parent-child checks instead of valid lower/upper bounds for BST validation.'],
  practice:['State what Height(node) returns before tracing it.','Explain preorder/inorder/postorder by action timing.','Validate a BST using an allowed numeric range.']
},
heaps:{
  icon:'△',title:'Heaps & Priority Queues',tagline:'Keep the next best item accessible without fully sorting everything.',chips:['Min/max','Top K','Streaming median','K-way merge','Scheduling'],
  mental:[['Tournament tree','The root is globally best; every parent only promises to beat its children. Siblings are not ordered.'],['Partial ordering','A heap answers “what is next?” cheaply, not “what is every item in order?”'],['Bounded winners','A size-k heap keeps only the k candidates that still matter.']],
  visual:{name:'Min-heap insertion: bubble upward',code:['heap.Add(value);','var child = heap.Count - 1;','while (child > 0)','{','    var parent = (child - 1) / 2;','    if (heap[parent] <= heap[child]) break;','    (heap[parent], heap[child]) = (heap[child], heap[parent]);','    child = parent;','}'],frames:[
    [T([['2',340,55],['5',210,170],['8',470,170],['9',145,305],['7',275,305]],[['2','5'],['2','8'],['5','9'],['5','7']]),0,'Existing heap satisfies parent ≤ children. Append value 1 at the next open slot.'],
    [T([['2',340,55],['5',210,170],['8',470,170],['9',145,305],['7',275,305],['1',405,305]],[['2','5'],['2','8'],['5','9'],['5','7'],['8','1']],'1'),4,'Compare 1 with parent 8. The invariant is broken.'],
    [T([['2',340,55],['5',210,170],['1',470,170],['9',145,305],['7',275,305],['8',405,305]],[['2','5'],['2','1'],['5','9'],['5','7'],['1','8']],'1'),6,'Swap 1 and 8; continue at the parent position.'],
    [T([['1',340,55],['5',210,170],['2',470,170],['9',145,305],['7',275,305],['8',405,305]],[['1','5'],['1','2'],['5','9'],['5','7'],['2','8']],'1',['1']),8,'Swap with 2. The root is now the minimum and the heap invariant is restored.']
  ]},
  patterns:[
    ['Repeated min/max','Priority queue','Extract next best in log n.','O(log n)'],
    ['Top K elements','Size-k min-heap','Evict the weakest winner.','O(n log k)'],
    ['K sorted streams','Heap of stream heads','Advance only the stream that won.','O(n log k)'],
    ['Streaming median','Two heaps','Lower max-heap and upper min-heap balance.','O(log n)'],
    ['Meeting rooms / resources','Heap by finish time','Reuse earliest available resource.','O(n log n)'],
    ['Closest points','Bounded max-heap','Keep k smallest distances.','O(n log k)'],
    ['Best-first search','Heap by state score','Expand globally most promising state.','varies'],
    ['Frequency ordering','Heap or bucket sort','Prioritize by count.','O(n log k)']
  ],
  templates:[['Top K with PriorityQueue','var heap = new PriorityQueue<int, int>();\nforeach (var value in values)\n{\n    heap.Enqueue(value, value);\n    if (heap.Count > k) heap.Dequeue();\n}\nreturn heap.UnorderedItems.Select(x => x.Element).ToArray();'],['K-way merge','foreach (var list in lists)\n    if (list is not null) queue.Enqueue(list, list.Val);\nwhile (queue.TryDequeue(out var node, out _))\n{\n    Append(node);\n    if (node.Next is not null) queue.Enqueue(node.Next, node.Next.Val);\n}']],
  pitfalls:['Assuming heap iteration returns sorted order.','Using the wrong heap direction for a bounded top-k set.','Forgetting stale priority-queue entries in Dijkstra.','Sorting all n values when only k are needed.'],
  practice:['Explain why a size-k min-heap finds the k largest values.','Draw the array indices for parent and children.','Design the two-heap median invariants.']
},
tries:{
  icon:'Ψ',title:'Tries',tagline:'A tree where paths are prefixes and shared prefixes share memory.',chips:['Prefix search','Dictionary','Autocomplete','Wildcard DFS','Bitwise trie'],
  mental:[['Letters on edges','A node represents the prefix formed along the path from the root. End-of-word is separate from having children.'],['Prune by prefix','Backtracking can stop immediately when the current letters are not a dictionary prefix.'],['Space-time trade','Tries spend memory to answer prefix operations in O(word length).']],
  visual:{name:'Insert “cat”, then “car”',code:['var node = root;','foreach (var ch in word)','{','    if (!node.Children.TryGetValue(ch, out var next))','        node.Children[ch] = next = new TrieNode();','    node = next;','}','node.IsWord = true;'],frames:[
    [T([['root',340,45],['c',340,145]],[['root','c']],'c'),4,'Insert c: create the first prefix node.'],
    [T([['root',340,45],['c',340,145],['a',340,245]],[['root','c'],['c','a']],'a',['c']),5,'Insert a below c. The path now represents prefix “ca”.'],
    [T([['root',340,45],['c',340,145],['a',340,245],['t',240,350]],[['root','c'],['c','a'],['a','t']],'t',['c','a','t']),8,'Insert t and mark it as a complete word: “cat”.'],
    [T([['root',340,45],['c',340,145],['a',340,245],['t',240,350],['r',440,350]],[['root','c'],['c','a'],['a','t'],['a','r']],'r',['c','a','t','r']),8,'“car” reuses c→a, branches at r, and marks r as a word.']
  ]},
  patterns:[
    ['Prefix lookup','Trie walk','One edge per character.','O(L)'],
    ['Autocomplete','Prefix node + DFS','Enumerate descendants after matching prefix.','O(L+output)'],
    ['Grid word search','Trie + backtracking','Prune paths absent from dictionary.','search dependent'],
    ['Wildcard word','DFS over matching children','A wildcard branches to every child.','worst exponential'],
    ['Replace by root word','Trie shortest prefix','Stop at first IsWord node.','O(total chars)'],
    ['Maximum XOR','Bitwise trie','Prefer opposite bit greedily.','O(bits·n)'],
    ['Many string queries','Trie / suffix structure','Amortize shared prefix work.','O(total chars)'],
    ['Lexicographic enumeration','Ordered children','DFS child keys in order.','O(output)']
  ],
  templates:[['Trie node and insert','sealed class TrieNode\n{\n    public Dictionary<char, TrieNode> Children { get; } = new();\n    public bool IsWord { get; set; }\n}\n\nvoid Insert(string word)\n{\n    var node = root;\n    foreach (var ch in word)\n    {\n        if (!node.Children.TryGetValue(ch, out var next))\n            node.Children[ch] = next = new TrieNode();\n        node = next;\n    }\n    node.IsWord = true;\n}'],['Prefix walk','TrieNode? FindPrefix(string prefix)\n{\n    var node = root;\n    foreach (var ch in prefix)\n    {\n        if (!node.Children.TryGetValue(ch, out var next)) return null;\n        node = next;\n    }\n    return node;\n}']],
  pitfalls:['Treating every leaf as a complete word.','Forgetting that one word can be a prefix of another.','Using a 26-child array when the alphabet is not constrained.','Copying strings heavily during DFS instead of using a buffer.'],
  practice:['Trace shared nodes for “cat”, “car”, and “care”.','Explain why a trie helps multi-word grid search.','Add wildcard search to the basic trie.']
},
'union-find':{
  icon:'∪',title:'Union-Find (DSU)',tagline:'Maintain changing connected components without traversing them again.',chips:['Find root','Union','Path compression','Rank/size','Connectivity'],
  mental:[['Team representative','Every member follows parent links to a representative root. Same root means same component.'],['Flatten on lookup','Path compression rewires visited nodes directly to the root, making future finds nearly constant.'],['Merge small into large','Union by rank/size prevents tall trees before compression.']],
  visual:{name:'Union components with path compression',code:['int Find(int x)','{','    if (parent[x] != x)','        parent[x] = Find(parent[x]);','    return parent[x];','}','bool Union(int a, int b)','{','    var rootA = Find(a); var rootB = Find(b);','    if (rootA == rootB) return false;','    if (size[rootA] < size[rootB]) (rootA, rootB) = (rootB, rootA);','    parent[rootB] = rootA; size[rootA] += size[rootB];','    return true;','}'],frames:[
    [U([['A'],['B'],['C'],['D'],['E']]),7,'Initially every item is its own component and root.'],
    [U([['A','B'],['C'],['D'],['E']],'A–B'),11,'Union A and B: attach one root to the other.'],
    [U([['A','B'],['C','D'],['E']],'C–D'),11,'Union C and D. We now have three components.'],
    [U([['A','B','C','D'],['E']],'B–C'),11,'Union B and C merges their entire components, not just those nodes.'],
    [U([['A','B','C','D','E']],'D–E'),3,'Find(D) follows parents to the representative and compresses the path; then union E.']
  ]},
  patterns:[
    ['Streaming connectivity','Union-Find','Merge endpoints as edges arrive.','≈O(1) each'],
    ['Redundant edge / cycle','Union returns false','Already-same roots imply a cycle.','O(E α(V))'],
    ['Count components','Initialize V, decrement on successful union','Track component count incrementally.','O(E α(V))'],
    ['Merge accounts/groups','Union shared identifiers','All records sharing a key become one set.','near linear'],
    ['Kruskal MST','DSU cycle test','Accept cheapest edge joining distinct sets.','O(E log E)'],
    ['Grid islands added online','DSU active cells','Union new land with active neighbors.','near linear'],
    ['Equality constraints','Union equals, test not-equals','Compress equivalence classes.','near linear'],
    ['Offline connectivity','Sort events + DSU','Process queries in a useful order.','varies']
  ],
  templates:[['DSU implementation','sealed class Dsu(int n)\n{\n    private readonly int[] parent = Enumerable.Range(0, n).ToArray();\n    private readonly int[] size = Enumerable.Repeat(1, n).ToArray();\n    public int Find(int x) => parent[x] == x ? x : parent[x] = Find(parent[x]);\n    public bool Union(int a, int b)\n    {\n        a = Find(a); b = Find(b);\n        if (a == b) return false;\n        if (size[a] < size[b]) (a, b) = (b, a);\n        parent[b] = a; size[a] += size[b];\n        return true;\n    }\n}']],
  pitfalls:['Unioning raw nodes instead of their roots.','Omitting both rank/size and path compression.','Using DSU when actual paths or traversal order are required.','Forgetting to decrement component count only on a successful merge.'],
  practice:['Explain what Find returns and what Union returns.','Use failed Union calls to detect an undirected cycle.','Track island count as land cells are added.']
},
'grids-matrices':{
  icon:'▦',title:'Grids & Matrices',tagline:'A graph whose neighbors are computed instead of stored.',chips:['Flood fill','Multi-source BFS','Backtracking','2D prefix','Simulation'],
  mental:[['Implicit graph','Each cell is a vertex; legal direction moves are edges. Bounds and blocked cells define adjacency.'],['Choose visited strategy','Mark in-place when mutation is safe, or use a separate bool matrix. Mark before enqueue/recurse.'],['Distance wave','BFS spreads one Manhattan step per layer; multiple sources behave like simultaneous ripples.']],
  visual:{name:'Multi-source BFS distance wave',code:['var queue = new Queue<(int Row, int Col)>();','EnqueueAllSources(queue);','var distance = 0;','while (queue.Count > 0)','{','    for (var count = queue.Count; count > 0; count--)','    {','        var cell = queue.Dequeue();','        foreach (var next in ValidNeighbors(cell))','            if (visited.Add(next)) queue.Enqueue(next);','    }','    distance++;','}'],frames:[
    [G(['S','.','.','#','.','.','.','.','S'],3,[0,8],[],[0,8]),1,'Enqueue every source at distance 0. They share one queue.'],
    [G(['S','.','.','#','.','.','.','.','S'],3,[1,5,7],[0,8],[1,5,7]),8,'Process the first wave. Every newly discovered neighbor has distance 1.'],
    [G(['S','.','.','#','.','.','.','.','S'],3,[2,4,6],[0,1,5,7,8],[2,4,6]),8,'The next wave expands from all distance-1 cells.'],
    [G(['S','.','.','#','.','.','.','.','S'],3,[],[0,1,2,4,5,6,7,8],[]),11,'The queue empties after all reachable cells receive their minimum distance.']
  ]},
  patterns:[
    ['Count regions','DFS/BFS flood fill','Start traversal from each unvisited land cell.','O(rows·cols)'],
    ['Minimum steps','BFS','Each legal move has equal weight.','O(rows·cols)'],
    ['Nearest source','Multi-source BFS','Seed all sources at distance zero.','O(rows·cols)'],
    ['Find word/path','Backtracking','Choose, mark, recurse, unmark.','exponential'],
    ['Submatrix sum','2D prefix sum','Inclusion-exclusion over four corners.','O(1) query'],
    ['Rotate / spiral','Boundary simulation','Maintain shrinking top/right/bottom/left bounds.','O(rows·cols)'],
    ['Increasing path','DFS + memo / topo','Cell state caches best continuation.','O(rows·cols)'],
    ['Life / simultaneous update','Copy or encoded states','Do not let early updates affect later reads.','O(rows·cols)']
  ],
  templates:[['Grid DFS','void Dfs(int r, int c)\n{\n    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] == 0)\n        return;\n    grid[r][c] = 0;\n    foreach (var (dr, dc) in Directions)\n        Dfs(r + dr, c + dc);\n}'],['Direction vectors','(int dr, int dc)[] directions =\n[\n    (-1, 0), (1, 0), (0, -1), (0, 1)\n];']],
  pitfalls:['Swapping row and column bounds.','Marking visited after enqueueing and creating duplicates.','Forgetting to undo visited state in backtracking.','Updating a simulation in place when changes must be simultaneous.'],
  practice:['Model a grid explicitly as vertices and edges.','Explain why multi-source BFS is not “one BFS per source.”','Write the four-corner 2D prefix-sum formula.']
},
intervals:{
  icon:'↔',title:'Intervals & Sweep Lines',tagline:'Sort endpoints so overlap becomes a local decision.',chips:['Merge','Scheduling','Sweep line','Difference events','Two lists'],
  mental:[['Calendar blocks','After sorting by start, only the most recently merged interval can overlap the next one.'],['Events on a timeline','Convert each interval into start/end deltas; a running total describes how many intervals are active.'],['Greedy boundary','For maximum non-overlap, keep the interval that ends earliest—it leaves the most room.']],
  visual:{name:'Merge overlapping intervals',code:['Array.Sort(intervals, (a, b) => a.Start.CompareTo(b.Start));','var merged = new List<Interval>();','foreach (var current in intervals)','{','    if (merged.Count == 0 || merged[^1].End < current.Start)','        merged.Add(current);','    else','        merged[^1].End = Math.Max(merged[^1].End, current.End);','}'],frames:[
    [I([[1,3],[2,6],[8,10],[9,12]],0),0,'Sort by start time. Begin the merged output with [1,3].'],
    [I([[1,3],[2,6],[8,10],[9,12]],1,[0]),7,'[2,6] starts before 3 ends, so extend the current merged interval to [1,6].'],
    [I([[1,6],[8,10],[9,12]],1,[0]),5,'[8,10] does not overlap [1,6], so start a new output interval.'],
    [I([[1,6],[8,12]],1,[0,1]),7,'[9,12] overlaps [8,10], producing final interval [8,12].']
  ]},
  patterns:[
    ['Combine coverage','Sort + merge','Compare next start to current end.','O(n log n)'],
    ['Insert one interval','Copy, merge overlap, copy rest','Exploit already-sorted input.','O(n)'],
    ['Meeting rooms','Sort events or min-heap','Track simultaneous active intervals.','O(n log n)'],
    ['Max non-overlap','Greedy earliest finish','Preserve maximum remaining room.','O(n log n)'],
    ['Intersection of two lists','Two pointers','Advance the interval that ends first.','O(n+m)'],
    ['Maximum overlap point','Sweep-line deltas','Prefix sum across sorted events.','O(n log n)'],
    ['Many integer range updates','Difference array','Start +delta, end+1 −delta.','O(n+q)'],
    ['Covered / removed intervals','Sort by start, end descending','Track furthest end seen.','O(n log n)']
  ],
  templates:[['Merge intervals','Array.Sort(intervals, (a, b) => a[0].CompareTo(b[0]));\nvar result = new List<int[]>();\nforeach (var current in intervals)\n{\n    if (result.Count == 0 || result[^1][1] < current[0])\n        result.Add([current[0], current[1]]);\n    else\n        result[^1][1] = Math.Max(result[^1][1], current[1]);\n}'],['Intersection','while (i < first.Length && j < second.Length)\n{\n    var start = Math.Max(first[i][0], second[j][0]);\n    var end = Math.Min(first[i][1], second[j][1]);\n    if (start <= end) result.Add([start, end]);\n    if (first[i][1] < second[j][1]) i++; else j++;\n}']],
  pitfalls:['Not clarifying whether touching endpoints overlap.','Sorting only by start when equal-start tie behavior matters.','Using start-before-end event ordering incorrectly at equal timestamps.','Mutating input interval objects unintentionally.'],
  practice:['Prove why only the last merged interval matters.','Choose event tie ordering for closed versus half-open intervals.','Derive two-list interval intersection.']
},
'range-query-trees':{
  icon:'⌁',title:'Segment Trees & Fenwick Trees',tagline:'Store summaries of ranges so updates and queries avoid rescanning.',chips:['Range query','Point update','Lazy propagation','Fenwick tree','Coordinate compression'],
  mental:[['Range hierarchy','A segment-tree node summarizes an interval; a query decomposes into O(log n) disjoint stored intervals.'],['Update the ancestors','Changing one leaf only affects summaries on its path to the root.'],['Fenwick binary buckets','Index bits encode bucket size. Add lowbit to update ancestors; subtract lowbit to collect a prefix.']],
  visual:{name:'Segment-tree range sum query [2,5]',code:['int Query(int node, int left, int right, int ql, int qr)','{','    if (qr < left || right < ql) return 0;','    if (ql <= left && right <= qr) return tree[node];','    var mid = left + (right - left) / 2;','    return Query(node * 2, left, mid, ql, qr)','         + Query(node * 2 + 1, mid + 1, right, ql, qr);','}'],frames:[
    [T([['[0,7]',340,40],['[0,3]',190,135],['[4,7]',490,135],['[0,1]',100,250],['[2,3]',270,250],['[4,5]',410,250],['[6,7]',580,250]],[['[0,7]','[0,3]'],['[0,7]','[4,7]'],['[0,3]','[0,1]'],['[0,3]','[2,3]'],['[4,7]','[4,5]'],['[4,7]','[6,7]']],'[0,7]'),4,'[0,7] partially overlaps query [2,5], so split at the midpoint.'],
    [T([['[0,7]',340,40],['[0,3]',190,135],['[4,7]',490,135],['[0,1]',100,250],['[2,3]',270,250],['[4,5]',410,250],['[6,7]',580,250]],[['[0,7]','[0,3]'],['[0,7]','[4,7]'],['[0,3]','[0,1]'],['[0,3]','[2,3]'],['[4,7]','[4,5]'],['[4,7]','[6,7]']],'[2,3]',['[2,3]']),3,'[2,3] is fully covered, so use its stored sum without visiting leaves.'],
    [T([['[0,7]',340,40],['[0,3]',190,135],['[4,7]',490,135],['[0,1]',100,250],['[2,3]',270,250],['[4,5]',410,250],['[6,7]',580,250]],[['[0,7]','[0,3]'],['[0,7]','[4,7]'],['[0,3]','[0,1]'],['[0,3]','[2,3]'],['[4,7]','[4,5]'],['[4,7]','[6,7]']],'[4,5]',['[2,3]','[4,5]']),3,'[4,5] is also fully covered. [0,1] and [6,7] return the identity 0.'],
    [T([['[0,7]',340,40],['[0,3]',190,135],['[4,7]',490,135],['[0,1]',100,250],['[2,3]',270,250],['[4,5]',410,250],['[6,7]',580,250]],[['[0,7]','[0,3]'],['[0,7]','[4,7]'],['[0,3]','[0,1]'],['[0,3]','[2,3]'],['[4,7]','[4,5]'],['[4,7]','[6,7]']],'[0,7]',['[2,3]','[4,5]']),6,'Combine two stored summaries. Only O(log n + output pieces) nodes were needed.']
  ]},
  patterns:[
    ['Static range sum','Prefix sum','No updates needed.','O(1) query'],
    ['Point updates + prefix/range sum','Fenwick tree','Compact additive tree.','O(log n)'],
    ['General associative range query','Segment tree','Store sum/min/max/gcd summaries.','O(log n)'],
    ['Range updates + queries','Lazy segment tree','Delay pushing updates to children.','O(log n)'],
    ['Large sparse coordinates','Coordinate compression','Map sorted values to dense indices.','O(n log n)'],
    ['Count smaller / inversions','Fenwick + compression','Query prior frequencies by rank.','O(n log n)'],
    ['Dynamic interval maximum','Segment tree','Update/query aggregate ranges.','O(log n)'],
    ['Immutable 2D ranges','2D prefix sum','Four-corner inclusion-exclusion.','O(1) query']
  ],
  templates:[['Fenwick tree','void Add(int index, int delta)\n{\n    for (index++; index < bit.Length; index += index & -index)\n        bit[index] += delta;\n}\nint PrefixSum(int index)\n{\n    var sum = 0;\n    for (index++; index > 0; index -= index & -index)\n        sum += bit[index];\n    return sum;\n}'],['Segment query cases','if (queryRight < left || right < queryLeft)\n    return Identity;\nif (queryLeft <= left && right <= queryRight)\n    return tree[node];\nreturn Combine(Query(leftChild), Query(rightChild));']],
  pitfalls:['Using these structures when simple prefix sums suffice.','Wrong identity value: 0 works for sum, not min.','Fenwick one-based indexing mistakes.','Forgetting lazy propagation before descending.'],
  practice:['Decompose [2,5] into segment-tree nodes.','Explain index += index & -index.','Choose prefix sum, Fenwick, or segment tree from update/query requirements.']
}
};

function renderVisual(v){
  if(v.type==='boxes'){
    return `<div class="box-row">${v.items.map((x,i)=>`<div class="box ${v.active.includes(i)?'active':''} ${v.done.includes(i)?'done':''}" data-index="${i}">${esc(x)}</div>`).join('')}${Object.entries(v.pointers).map(([name,i])=>`<div class="pointer" style="left:${12+i*59+26}px;top:4px">${esc(name)}</div>`).join('')}</div>`;
  }
  if(v.type==='chain'){
    return `<div class="chain">${v.items.map((x,i)=>`<div class="chain-node ${v.active.includes(i)?'active':''} ${v.done.includes(i)?'done':''}">${Object.entries(v.pointers).filter(([,p])=>p===i).map(([n])=>`<span class="node-pointer">${esc(n)} ▼</span>`).join('')}${esc(x)}</div>${i<v.items.length-1?'<span class="arrow">→</span>':''}`).join('')}</div>`;
  }
  if(v.type==='stack')return `<div><div class="stack-view">${v.items.map((x,i)=>`<div class="stack-item ${i===v.active?'active':''}">${esc(x)}</div>`).join('')}</div><div class="stack-base">stack bottom</div></div>`;
  if(v.type==='hash')return `<div class="buckets">${v.buckets.map((x,i)=>`<div class="bucket ${i===v.active?'active':''} ${v.done.includes(i)?'done':''}"><span class="bucket-key">${esc(x[0])}</span><span class="bucket-value">${esc(x[1])}</span></div>`).join('')||'<span class="muted">empty dictionary</span>'}</div>`;
  if(v.type==='tree'){
    const map=Object.fromEntries(v.nodes.map(n=>[n[0],n]));return `<svg class="tree-svg" viewBox="0 0 680 400">${v.edges.map(([a,b])=>`<line x1="${map[a][1]}" y1="${map[a][2]}" x2="${map[b][1]}" y2="${map[b][2]}" class="tree-edge ${v.activeEdge===`${a}-${b}`?'active':''}"/>`).join('')}${v.nodes.map(([n,x,y])=>`<circle cx="${x}" cy="${y}" r="27" class="tree-node ${v.active===n?'active':''} ${v.done.includes(n)?'done':''}"/><text x="${x}" y="${y}" font-size="${n.length>4?10:14}">${esc(n)}</text>`).join('')}</svg>`;
  }
  if(v.type==='grid')return `<div class="grid-view" style="grid-template-columns:repeat(${v.cols},52px)">${v.cells.map((x,i)=>`<div class="cell ${x==='#'?'wall':''} ${v.active.includes(i)?'active':''} ${v.done.includes(i)?'done':''} ${v.frontier.includes(i)?'frontier':''}">${esc(x)}</div>`).join('')}</div>`;
  if(v.type==='intervals'){const max=Math.max(...v.bars.map(x=>x[1]));return `<div class="interval-view">${v.bars.map(([a,b],i)=>`<div class="interval-bar ${i===v.active?'active':''} ${v.done.includes(i)?'done':''}" style="left:${a/max*90}%;width:${(b-a)/max*90}%;top:${25+i*45}px">[${a},${b}]</div>`).join('')}</div>`}
  if(v.type==='groups')return `<div class="groups">${v.groups.map((g,i)=>`<div class="group"><b>component ${i+1}</b>${g.map(x=>`<span>${esc(x)}</span>`).join('')}</div>`).join('')}<div style="flex-basis:100%;text-align:center;color:var(--yellow)">${esc(v.active)}</div></div>`;
  return '';
}

function renderPage(t){
  document.title=`${t.title} · Coding Interview Lab`;$('#sideIcon').textContent=t.icon;$('#sideTitle').textContent=t.title;
  $('#content').innerHTML=`
    <section id="start"><div class="eyebrow">Data structure interview lab</div><h1>${t.title}</h1><p class="lede">${t.tagline}</p><div class="chips">${t.chips.map(x=>`<span class="chip">${x}</span>`).join('')}</div><div class="hero-note"><b>How to use this page:</b> learn the physical mental model, predict each animation step, connect problem signals to patterns, then rehearse the C# templates.</div><div class="grid">${t.mental.map(([h,p])=>`<div class="card"><h3>${h}</h3><p>${p}</p></div>`).join('')}</div></section>
    <section id="visual"><div class="eyebrow">Interactive execution</div><h2>${t.visual.name}</h2><div class="lab"><div class="stage"><div class="controls"><button class="control" id="reset">↺ Reset</button><button class="control primary" id="step">Step →</button><button class="control" id="play">▶ Play</button></div><div class="visual" id="visualStage"></div></div><div class="inspector"><h3>State transition</h3><div class="status" id="status"></div><div class="label">C# line executing</div><div class="code" id="walkCode"></div><div class="label">Interview habit</div><p class="muted">Before stepping, say what must remain true. That invariant is more valuable than memorizing syntax.</p></div></div></section>
    <section id="patterns"><div class="eyebrow">Problem recognition</div><h2>Map clues to patterns.</h2><p class="lede">These archetypes cover the recurring mental models behind a large share of interview and LeetCode-style questions.</p><input class="search" id="patternSearch" placeholder="Filter patterns…"><div class="card full"><table class="pattern-table"><thead><tr><th>Problem signal</th><th>Pattern</th><th>Why it fits</th><th>Runtime</th></tr></thead><tbody>${t.patterns.map(r=>`<tr><td>${r[0]}</td><td><strong>${r[1]}</strong></td><td>${r[2]}</td><td class="complexity">${r[3]}</td></tr>`).join('')}</tbody></table></div></section>
    <section id="templates"><div class="eyebrow">C# toolbox</div><h2>Templates to understand, not memorize blindly.</h2><p class="lede">Click a template, then explain every state variable and invariant aloud.</p>${t.templates.map((x,i)=>`<div class="accordion ${i===0?'open':''}"><button>${x[0]} <span style="float:right">＋</span></button><pre class="code">${esc(x[1])}</pre></div>`).join('')}</section>
    <section id="pitfalls"><div class="eyebrow">Failure modes</div><h2>Catch these before the interviewer does.</h2><div class="grid">${t.pitfalls.map((x,i)=>`<div class="card half pitfall"><h3>${String(i+1).padStart(2,'0')}</h3><p>${x}</p></div>`).join('')}</div></section>
    <section id="practice"><div class="eyebrow">Active recall</div><h2>Prove the mental model.</h2><div class="grid">${t.practice.map((x,i)=>`<div class="card full prompt"><i>${i+1}</i><div><h3>Explain or implement</h3><p>${x}</p></div></div>`).join('')}</div><div class="hero-note">Ready test: you can identify the structure from problem clues, state the invariant before coding, derive the complexity, and implement the core pattern without copying.</div></section>`;
}

if(!topics[topicKey])throw new Error(`Unknown topic: ${topicKey}`);
renderPage(topics[topicKey]);
let frame=0,playing=false;
function draw(){const t=topics[topicKey],f=t.visual.frames[frame];$('#visualStage').innerHTML=renderVisual(f[0]);$('#status').innerHTML=`<b>Step ${frame+1}/${t.visual.frames.length}</b><br>${f[2]}`;$('#walkCode').innerHTML=code(t.visual.code,f[1]);$('#step').disabled=frame===t.visual.frames.length-1}
function reset(){playing=false;$('#play').textContent='▶ Play';frame=0;draw()}
$('#step').onclick=()=>{if(frame<topics[topicKey].visual.frames.length-1){frame++;draw()}};
$('#reset').onclick=reset;
$('#play').onclick=async()=>{playing=!playing;$('#play').textContent=playing?'❚❚ Pause':'▶ Play';while(playing&&frame<topics[topicKey].visual.frames.length-1){await new Promise(r=>setTimeout(r,850));if(playing){frame++;draw()}}playing=false;$('#play').textContent='▶ Play'};
$('#patternSearch').oninput=e=>{$$('.pattern-table tbody tr').forEach(r=>r.style.display=r.textContent.toLowerCase().includes(e.target.value.toLowerCase())?'table-row':'none')};
$$('.accordion button').forEach(b=>b.onclick=()=>b.parentElement.classList.toggle('open'));
$('#present').onclick=()=>{document.body.classList.toggle('presentation');$('#present').textContent=document.body.classList.contains('presentation')?'✕ Exit':'⛶ Presentation'};
const sections=$$('section'),links=$$('nav a');new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id));$('#progress').style.width=`${(sections.indexOf(e.target)+1)/sections.length*100}%`}}),{threshold:.45}).observe(sections[0]);sections.slice(1).forEach(s=>new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle('active',a.hash==='#'+e.target.id));$('#progress').style.width=`${(sections.indexOf(e.target)+1)/sections.length*100}%`}}),{threshold:.45}).observe(s));
document.addEventListener('keydown',e=>{if(['INPUT','SELECT'].includes(document.activeElement.tagName))return;if(e.key===' '){e.preventDefault();$('#step').click()}if(e.key.toLowerCase()==='p')$('#present').click();if(['ArrowLeft','ArrowRight'].includes(e.key)){const i=Math.max(0,sections.findIndex(s=>location.hash==='#'+s.id)),n=e.key==='ArrowRight'?Math.min(sections.length-1,i+1):Math.max(0,i-1);sections[n].scrollIntoView()}});
draw();
