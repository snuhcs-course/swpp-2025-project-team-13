import json
import zipfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from restaurant.models import Restaurant, RestaurantMenu
from menu.models import Menu, MenuCandidate


def _to_decimal(s: Optional[str]) -> Optional[float]:
    if s is None:
        return None
    try:
        return float(str(s).strip())
    except Exception:
        return None


def _pick_first(images: Optional[List[str]]) -> Optional[str]:
    if not images:
        return None
    return images[0] if images else None


def _clean_price(raw: Optional[str]) -> Optional[int]:
    if raw is None:
        return None
    s = str(raw).replace(",", "").strip()
    if s == "":
        return None
    try:
        return int(float(s))
    except Exception:
        return None


def _extract_place(node: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
    if "detail_info" in node and node["detail_info"]:
        return "detail", node["detail_info"]
    bi = (node.get("basic_info") or {}).get("place_data") or {}
    return "basic", bi


def _restaurant_identity(place: Dict[str, Any]) -> Tuple[str, str]:
    name = (place.get("name") or "").strip()
    addr = (place.get("road_address") or place.get("address") or "").strip()
    return name, addr


class Command(BaseCommand):
    help = "Import restaurants and menus from a JSON file (or a ZIP file containing one) into Restaurant/MenuCandidate/RestaurantMenu."

    def add_arguments(self, parser):
        parser.add_argument("filepath", type=str, help="Path to the JSON or ZIP file (array of place objects).")
        parser.add_argument(
            "--source",
            type=str,
            default="naver",
            help="Source label to store (e.g., naver, kakao, google). Default: naver",
        )
        parser.add_argument("--dry-run", action="store_true", help="Parse and simulate without DB writes.")
        parser.add_argument("--limit", type=int, default=None, help="Stop after N restaurants processed.")
        parser.add_argument("--batch-size", type=int, default=500, help="DB commit batch size. Default: 500")
        parser.add_argument(
            "--overwrite-menu-candidate",
            action="store_true",
            help="If set, update MenuCandidate price/image for duplicates instead of skipping.",
        )

    def handle(self, **options):
        path = Path(options["filepath"])
        if not path.exists():
            raise CommandError(f"File not found: {path}")

        source_label = options["source"].strip()
        dry_run = options["dry_run"]
        limit = options["limit"]
        batch_size = max(1, int(options["batch_size"]))
        overwrite_menu_candidate = options["overwrite_menu_candidate"]

        # zip 지원
        if path.suffix == ".zip":
            with zipfile.ZipFile(path, "r") as zip_ref:
                json_filename = None
                for fname in zip_ref.namelist():
                    if fname.endswith(".json"):
                        json_filename = fname
                        break
                if not json_filename:
                    raise CommandError(f"No .json file found inside: {path}")
                with zip_ref.open(json_filename) as f:
                    file_bytes = f.read()
                    try:
                        text = file_bytes.decode("utf-8")
                    except Exception:
                        text = file_bytes.decode("cp949")
                    data = json.loads(text)
        else:
            data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            raise CommandError("Top-level JSON must be an array.")

        total = len(data) if limit is None else min(len(data), limit)
        if total == 0:
            self.stdout.write(self.style.WARNING("No items to process."))
            return

        stats = {
            "restaurants_upserted": 0,
            "restaurants_skipped": 0,
            "menu_candidates_created": 0,
            "menu_candidates_updated": 0,
            "menu_candidates_skipped": 0,
            "restaurant_menu_linked": 0,
            "restaurant_menu_skipped": 0,
            "errors": 0,
        }

        now = timezone.now()
        batch_counter = 0

        @transaction.atomic
        def commit_batch():
            return

        for idx, node in enumerate(data[:total], start=1):
            try:
                scope, place = _extract_place(node)
                raw_id = str(node.get("id") or place.get("id") or "").strip()
                external_id = f"{source_label}:{raw_id}" if raw_id else source_label

                lat = _to_decimal(place.get("y") or place.get("latitude"))
                lon = _to_decimal(place.get("x") or place.get("longitude"))
                name, address = _restaurant_identity(place)
                phone = (place.get("phone") or "").strip() or None

                img = None
                for key in ("images", "place_images"):
                    img = _pick_first(place.get(key))
                    if img:
                        break

                if dry_run:
                    existed = Restaurant.objects.filter(name=name, address=address).exists()
                    if existed:
                        stats["restaurants_skipped"] += 1
                    else:
                        stats["restaurants_upserted"] += 1
                    restaurant = Restaurant(name=name, address=address)
                    restaurant.id = -1
                else:
                    restaurant, created = Restaurant.objects.update_or_create(
                        name=name,
                        address=address,
                        defaults={
                            "latitude": lat,
                            "longitude": lon,
                            "phone": phone,
                            "image_url": img,
                            "source": external_id,
                            "created_at": restaurant_created_at(now, created_hint=scope),
                        },
                    )
                    if created:
                        stats["restaurants_upserted"] += 1
                    else:
                        stats["restaurants_skipped"] += 1

                menus = (node.get("detail_info") or {}).get("menus") or []
                for m in menus:
                    m_name = (m.get("name") or "").strip()
                    if not m_name:
                        continue
                    price = _clean_price(m.get("price"))
                    m_img = _pick_first(m.get("images") or [])

                    if dry_run:
                        exists = MenuCandidate.objects.filter(
                            restaurant_id=getattr(restaurant, "id", None) if not dry_run else None,
                            name=m_name,
                            price=price,
                        ).exists()
                        if exists and not overwrite_menu_candidate:
                            stats["menu_candidates_skipped"] += 1
                        else:
                            if exists and overwrite_menu_candidate:
                                stats["menu_candidates_updated"] += 1
                            else:
                                stats["menu_candidates_created"] += 1
                    else:
                        mc_qs = MenuCandidate.objects.filter(restaurant=restaurant, name=m_name, price=price)
                        if mc_qs.exists():
                            if overwrite_menu_candidate:
                                mc = mc_qs.first()
                                mc.image_url = m_img or mc.image_url
                                mc.save(update_fields=["image_url"])
                                stats["menu_candidates_updated"] += 1
                            else:
                                stats["menu_candidates_skipped"] += 1
                        else:
                            MenuCandidate.objects.create(
                                restaurant=restaurant,
                                name=m_name,
                                price=price,
                                image_url=m_img,
                                created_at=now,
                            )
                            stats["menu_candidates_created"] += 1

                        menu_obj = Menu.objects.filter(name=m_name).first()
                        if menu_obj:
                            if not RestaurantMenu.objects.filter(restaurant=restaurant, menu=menu_obj).exists():
                                RestaurantMenu.objects.create(restaurant=restaurant, menu=menu_obj)
                                stats["restaurant_menu_linked"] += 1
                            else:
                                stats["restaurant_menu_skipped"] += 1
                        else:
                            stats["restaurant_menu_skipped"] += 1

                if not dry_run:
                    batch_counter += 1
                    if (batch_counter % batch_size) == 0:
                        commit_batch()

                if idx % 200 == 0 or idx == total:
                    self.stdout.write(
                        self.style.HTTP_INFO(
                            f"Processed {idx}/{total} | R(upserted/skipped) "
                            f"{stats['restaurants_upserted']}/{stats['restaurants_skipped']} | "
                            f"MC(created/updated/skipped) {stats['menu_candidates_created']}/"
                            f"{stats['menu_candidates_updated']}/{stats['menu_candidates_skipped']} | "
                            f"RM(linked/skipped) {stats['restaurant_menu_linked']}/{stats['restaurant_menu_skipped']}"
                        )
                    )

            except Exception as e:
                stats["errors"] += 1
                self.stderr.write(self.style.ERROR(f"[ERROR] index={idx} : {e}"))

        if not dry_run and (batch_counter % batch_size) != 0:
            commit_batch()

        self.stdout.write(self.style.SUCCESS("=== Import finished ==="))
        for k, v in stats.items():
            self.stdout.write(f"{k}: {v}")


def restaurant_created_at(now, created_hint: str):
    return now

