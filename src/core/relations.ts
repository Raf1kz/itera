/**
 * Concept graph and card relationship management
 * Builds and analyzes relationships between cards
 */

import { CardExtended } from '../schemas';

// ============================================================================
// GRAPH DATA STRUCTURES
// ============================================================================

/**
 * Adjacency list representation of card relationships
 */
export interface RelationGraph {
  /**
   * Map of card ID to array of related card IDs
   */
  adjacency: Map<string, string[]>;

  /**
   * Total number of nodes (cards) in the graph
   */
  nodeCount: number;

  /**
   * Total number of edges (relationships) in the graph
   */
  edgeCount: number;

  /**
   * Bidirectional edges (both cards reference each other)
   */
  bidirectionalEdges: number;

  /**
   * Unidirectional edges (only one card references the other)
   */
  unidirectionalEdges: number;
}

/**
 * Card with relationship metadata
 */
export interface CardWithRelations extends CardExtended {
  /**
   * Number of incoming relationships (how many cards reference this one)
   */
  inDegree: number;

  /**
   * Number of outgoing relationships (how many cards this one references)
   */
  outDegree: number;

  /**
   * Total degree (in + out)
   */
  totalDegree: number;
}

// ============================================================================
// GRAPH CONSTRUCTION
// ============================================================================

/**
 * Build an adjacency list from a collection of cards
 *
 * @param cards Array of extended cards with relations
 * @returns Graph with adjacency list and metadata
 */
export function buildRelationGraph(cards: CardExtended[]): RelationGraph {
  const adjacency = new Map<string, string[]>();
  let edgeCount = 0;
  let bidirectionalEdges = 0;
  let unidirectionalEdges = 0;

  // Initialize adjacency list
  for (const card of cards) {
    adjacency.set(card.id, card.relations || []);
  }

  // Count edges and determine types
  const processed = new Set<string>();

  for (const card of cards) {
    const relations = card.relations || [];

    for (const relatedId of relations) {
      const edgeKey = [card.id, relatedId].sort().join('-');

      if (!processed.has(edgeKey)) {
        processed.add(edgeKey);

        // Check if bidirectional
        const relatedCard = cards.find(c => c.id === relatedId);
        const isBidirectional =
          relatedCard?.relations?.includes(card.id) ?? false;

        if (isBidirectional) {
          bidirectionalEdges++;
        } else {
          unidirectionalEdges++;
        }

        edgeCount++;
      }
    }
  }

  return {
    adjacency,
    nodeCount: cards.length,
    edgeCount,
    bidirectionalEdges,
    unidirectionalEdges
  };
}

/**
 * Build a graph with only bidirectional relationships
 *
 * @param cards Array of cards
 * @returns Graph with only mutual relationships
 */
export function buildBidirectionalGraph(cards: CardExtended[]): RelationGraph {
  const adjacency = new Map<string, string[]>();
  const cardMap = new Map(cards.map(c => [c.id, c]));

  let edgeCount = 0;

  for (const card of cards) {
    const bidirectionalRelations: string[] = [];

    for (const relatedId of card.relations || []) {
      const relatedCard = cardMap.get(relatedId);
      if (relatedCard?.relations?.includes(card.id)) {
        bidirectionalRelations.push(relatedId);
      }
    }

    adjacency.set(card.id, bidirectionalRelations);
    edgeCount += bidirectionalRelations.length;
  }

  // Each edge counted twice (once from each direction)
  edgeCount = edgeCount / 2;

  return {
    adjacency,
    nodeCount: cards.length,
    edgeCount,
    bidirectionalEdges: edgeCount,
    unidirectionalEdges: 0
  };
}

// ============================================================================
// GRAPH ANALYSIS
// ============================================================================

/**
 * Calculate degree (number of connections) for each card
 *
 * @param cards Array of cards
 * @param graph Relationship graph
 * @returns Cards with degree metadata
 */
export function calculateDegrees(
  cards: CardExtended[],
  graph: RelationGraph
): CardWithRelations[] {
  const inDegrees = new Map<string, number>();
  const outDegrees = new Map<string, number>();

  // Initialize
  for (const card of cards) {
    inDegrees.set(card.id, 0);
    outDegrees.set(card.id, card.relations?.length || 0);
  }

  // Count in-degrees
  for (const relations of graph.adjacency.values()) {
    for (const relatedId of relations) {
      inDegrees.set(relatedId, (inDegrees.get(relatedId) || 0) + 1);
    }
  }

  return cards.map(card => {
    const inDegree = inDegrees.get(card.id) || 0;
    const outDegree = outDegrees.get(card.id) || 0;

    return {
      ...card,
      inDegree,
      outDegree,
      totalDegree: inDegree + outDegree
    };
  });
}

/**
 * Find hub cards (cards with many connections)
 *
 * @param cardsWithRelations Cards with degree metadata
 * @param topN Number of hubs to return
 * @returns Top N most connected cards
 */
export function findHubCards(
  cardsWithRelations: CardWithRelations[],
  topN = 10
): CardWithRelations[] {
  return [...cardsWithRelations]
    .sort((a, b) => b.totalDegree - a.totalDegree)
    .slice(0, topN);
}

/**
 * Find isolated cards (cards with no connections)
 *
 * @param cards Array of cards
 * @returns Cards with no relationships
 */
export function findIsolatedCards(cards: CardExtended[]): CardExtended[] {
  return cards.filter(
    card => !card.relations || card.relations.length === 0
  );
}

// ============================================================================
// TRAVERSAL ALGORITHMS
// ============================================================================

/**
 * Find all cards connected to a given card (depth-first search)
 *
 * @param startCardId Starting card ID
 * @param graph Relationship graph
 * @param maxDepth Maximum depth to traverse (default: unlimited)
 * @returns Set of connected card IDs
 */
export function findConnectedCards(
  startCardId: string,
  graph: RelationGraph,
  maxDepth = Infinity
): Set<string> {
  const visited = new Set<string>();
  const stack: [string, number][] = [[startCardId, 0]];

  while (stack.length > 0) {
    const [cardId, depth] = stack.pop()!;

    if (visited.has(cardId) || depth > maxDepth) {
      continue;
    }

    visited.add(cardId);

    const neighbors = graph.adjacency.get(cardId) || [];
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        stack.push([neighborId, depth + 1]);
      }
    }
  }

  // Remove starting card from results
  visited.delete(startCardId);

  return visited;
}

/**
 * Find shortest path between two cards (breadth-first search)
 *
 * @param startCardId Starting card ID
 * @param endCardId Target card ID
 * @param graph Relationship graph
 * @returns Path as array of card IDs, or null if no path exists
 */
export function findShortestPath(
  startCardId: string,
  endCardId: string,
  graph: RelationGraph
): string[] | null {
  if (startCardId === endCardId) {
    return [startCardId];
  }

  const visited = new Set<string>();
  const queue: [string, string[]][] = [[startCardId, [startCardId]]];

  while (queue.length > 0) {
    const [cardId, path] = queue.shift()!;

    if (cardId === endCardId) {
      return path;
    }

    if (visited.has(cardId)) {
      continue;
    }

    visited.add(cardId);

    const neighbors = graph.adjacency.get(cardId) || [];
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        queue.push([neighborId, [...path, neighborId]]);
      }
    }
  }

  return null; // No path found
}

/**
 * Find all cards within N hops of a given card
 *
 * @param cardId Starting card ID
 * @param graph Relationship graph
 * @param maxHops Maximum number of hops (default: 2)
 * @returns Cards grouped by distance
 */
export function findCardsByDistance(
  cardId: string,
  graph: RelationGraph,
  maxHops = 2
): Map<number, Set<string>> {
  const result = new Map<number, Set<string>>();
  const visited = new Set<string>([cardId]);
  const queue: [string, number][] = [[cardId, 0]];

  while (queue.length > 0) {
    const [currentId, distance] = queue.shift()!;

    if (distance > maxHops) {
      continue;
    }

    if (distance > 0) {
      if (!result.has(distance)) {
        result.set(distance, new Set());
      }
      result.get(distance)!.add(currentId);
    }

    const neighbors = graph.adjacency.get(currentId) || [];
    for (const neighborId of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push([neighborId, distance + 1]);
      }
    }
  }

  return result;
}

// ============================================================================
// CLUSTERING & COMMUNITIES
// ============================================================================

/**
 * Concept cluster identified by source paragraph hash
 */
export interface ConceptCluster {
  /**
   * Unique identifier for this cluster (paragraph hash)
   */
  id: string;

  /**
   * Cards belonging to this cluster
   */
  cards: CardExtended[];

  /**
   * Number of cards in cluster
   */
  size: number;

  /**
   * Source context (original paragraph text) if available
   */
  context?: string;
}

/**
 * Detect concept clusters based on source paragraph hashes
 * Groups cards that originated from the same source paragraph
 *
 * @param cards Array of cards with source metadata
 * @returns Array of concept clusters, sorted by size (descending)
 */
export function detectConceptClusters(cards: CardExtended[]): ConceptCluster[] {
  const clusters = new Map<string, CardExtended[]>();

  // Group cards by sourceHash
  for (const card of cards) {
    // Check for source hash in the source field (from edge function)
    const sourceHash = (card as any).source?.hash;

    if (!sourceHash) {
      // Skip cards without source metadata
      continue;
    }

    if (!clusters.has(sourceHash)) {
      clusters.set(sourceHash, []);
    }

    clusters.get(sourceHash)!.push(card);
  }

  // Convert to ConceptCluster objects
  const result: ConceptCluster[] = [];

  for (const [hash, clusterCards] of clusters.entries()) {
    // Try to get context from first card's sourceContext
    const context = clusterCards[0]?.sourceContext;

    const cluster: ConceptCluster = {
      id: hash,
      cards: clusterCards,
      size: clusterCards.length
    };

    if (typeof context === 'string') {
      cluster.context = context;
    }

    result.push(cluster);
  }

  // Sort by cluster size (largest first)
  return result.sort((a, b) => b.size - a.size);
}

/**
 * Get cluster statistics
 *
 * @param clusters Array of concept clusters
 * @returns Summary statistics
 */
export function getClusterStats(clusters: ConceptCluster[]): {
  totalClusters: number;
  totalCards: number;
  avgClusterSize: number;
  maxClusterSize: number;
  minClusterSize: number;
  singletonClusters: number;
} {
  const totalClusters = clusters.length;
  const totalCards = clusters.reduce((sum, c) => sum + c.size, 0);
  const avgClusterSize = totalClusters > 0 ? totalCards / totalClusters : 0;
  const maxClusterSize = clusters.length > 0 ? Math.max(...clusters.map(c => c.size)) : 0;
  const minClusterSize = clusters.length > 0 ? Math.min(...clusters.map(c => c.size)) : 0;
  const singletonClusters = clusters.filter(c => c.size === 1).length;

  return {
    totalClusters,
    totalCards,
    avgClusterSize,
    maxClusterSize,
    minClusterSize,
    singletonClusters
  };
}

/**
 * Find the cluster containing a specific card
 *
 * @param cardId Card ID to search for
 * @param clusters Array of concept clusters
 * @returns Cluster containing the card, or null if not found
 */
export function findClusterForCard(
  cardId: string,
  clusters: ConceptCluster[]
): ConceptCluster | null {
  for (const cluster of clusters) {
    if (cluster.cards.some(card => card.id === cardId)) {
      return cluster;
    }
  }
  return null;
}

/**
 * Get related cards from the same concept cluster
 *
 * @param cardId Card ID
 * @param clusters Array of concept clusters
 * @returns Related cards from the same cluster (excluding the input card)
 */
export function getClusterPeers(
  cardId: string,
  clusters: ConceptCluster[]
): CardExtended[] {
  const cluster = findClusterForCard(cardId, clusters);

  if (!cluster) {
    return [];
  }

  return cluster.cards.filter(card => card.id !== cardId);
}

/**
 * Find connected components (groups of related cards)
 *
 * @param graph Relationship graph
 * @returns Array of component sets (each set is a group of connected cards)
 */
export function findConnectedComponents(graph: RelationGraph): Set<string>[] {
  const visited = new Set<string>();
  const components: Set<string>[] = [];

  for (const cardId of graph.adjacency.keys()) {
    if (!visited.has(cardId)) {
      const component = findConnectedCards(cardId, graph);
      component.add(cardId); // Add starting card back

      for (const id of component) {
        visited.add(id);
      }

      components.push(component);
    }
  }

  return components.sort((a, b) => b.size - a.size);
}

/**
 * Calculate clustering coefficient (how interconnected neighbors are)
 *
 * @param cardId Card to analyze
 * @param graph Relationship graph
 * @returns Clustering coefficient (0-1)
 */
export function calculateClusteringCoefficient(
  cardId: string,
  graph: RelationGraph
): number {
  const neighbors = graph.adjacency.get(cardId) || [];

  if (neighbors.length < 2) {
    return 0;
  }

  // Count edges between neighbors
  let edgesBetweenNeighbors = 0;

  for (let i = 0; i < neighbors.length; i++) {
    const neighbor1 = neighbors[i];
    if (!neighbor1) {
      continue;
    }

    const neighbor1Relations = graph.adjacency.get(neighbor1) || [];

    for (let j = i + 1; j < neighbors.length; j++) {
      const neighbor2 = neighbors[j];
      if (!neighbor2) {
        continue;
      }

      if (neighbor1Relations.includes(neighbor2)) {
        edgesBetweenNeighbors++;
      }
    }
  }

  // Maximum possible edges = n(n-1)/2
  const maxEdges = (neighbors.length * (neighbors.length - 1)) / 2;

  return maxEdges > 0 ? edgesBetweenNeighbors / maxEdges : 0;
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

/**
 * Suggest related cards to study together
 *
 * @param cardId Card to find suggestions for
 * @param cards All cards
 * @param graph Relationship graph
 * @param limit Maximum suggestions to return
 * @returns Suggested card IDs with relevance scores
 */
export function suggestRelatedCards(
  cardId: string,
  cards: CardExtended[],
  graph: RelationGraph,
  limit = 5
): Array<{ cardId: string; score: number }> {
  const directRelations = graph.adjacency.get(cardId) || [];
  const suggestions = new Map<string, number>();

  // Score direct relations highest
  for (const relatedId of directRelations) {
    suggestions.set(relatedId, 10);
  }

  // Add second-degree relations
  for (const relatedId of directRelations) {
    const secondDegree = graph.adjacency.get(relatedId) || [];
    for (const secondId of secondDegree) {
      if (secondId !== cardId && !directRelations.includes(secondId)) {
        suggestions.set(secondId, (suggestions.get(secondId) || 0) + 5);
      }
    }
  }

  return Array.from(suggestions.entries())
    .map(([cardId, score]) => ({ cardId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Find cards with similar difficulty or Bloom level
 *
 * @param targetCard Card to compare against
 * @param cards All cards
 * @param limit Maximum cards to return
 * @returns Similar cards
 */
export function findSimilarCards(
  targetCard: CardExtended,
  cards: CardExtended[],
  limit = 5
): CardExtended[] {
  const difficultyThreshold = 2; // Within 2 points on 1-10 scale

  return cards
    .filter(card => card.id !== targetCard.id)
    .filter(
      card =>
        Math.abs(card.difficulty - targetCard.difficulty) <= difficultyThreshold ||
        card.bloom_level === targetCard.bloom_level
    )
    .slice(0, limit);
}
