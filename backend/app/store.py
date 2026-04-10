from typing import Dict, List, Optional

# submission_id -> ScoreResponse dict
_submissions: Dict[str, dict] = {}

# (problem_id, wallet) -> submission_id
_index: Dict[tuple, str] = {}


def get_by_id(submission_id: str) -> Optional[dict]:
    return _submissions.get(submission_id)


def get_by_wallet(problem_id: str, wallet: str) -> Optional[dict]:
    sid = _index.get((problem_id, wallet))
    return _submissions.get(sid) if sid else None


def save(data: dict) -> None:
    sid = data["submission_id"]
    _submissions[sid] = data
    _index[(data["problem_id"], data["wallet"])] = sid


def all_scores() -> List[dict]:
    return list(_submissions.values())
